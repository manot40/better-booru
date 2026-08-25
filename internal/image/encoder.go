package image

import (
	"bytes"
	"context"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"

	"github.com/davidbyttow/govips/v2/vips"
	"github.com/manot40/better-booru/internal/utils"
)

const (
	encoderHW  = "av1_qsv"
	encoderSW  = "libsvtav1"
	encoderReS = "scale='min(8704,iw)':'min(8704,ih)':force_original_aspect_ratio=decrease,scale=trunc(iw/2)*2:trunc(ih/2)*2"
)

var (
	hasLowCPU  = runtime.NumCPU() < 4
	isIntelGPU = utils.CheckIfIntelGPU()
)

// transcode runs FFmpeg to convert raw image bytes to an AVIF file.
func transcode(ctx context.Context, bin []byte, hash string) ([]byte, error) {
	outFile := filepath.Join(os.TempDir(), hash+".avif")
	defer os.Remove(outFile)

	if isIntelGPU {
		err := runFFmpeg(ctx, encoderHW, "null", bin, outFile)
		if err == nil {
			return os.ReadFile(outFile)
		}
	}

	if hasLowCPU {
		if err := EnsureVipsStarted(); err != nil {
			return nil, err
		}

		img, err := vips.NewImageFromBuffer(bin)
		if err != nil {
			return nil, fmt.Errorf("decoding image with vips: %w", err)
		}
		defer img.Close()

		buff, _, err := img.ExportAvif(&vips.AvifExportParams{
			Quality:       90,
			StripMetadata: true,
		})
		if err != nil {
			return nil, err
		}

		return buff, nil
	}

	err := runFFmpeg(ctx, encoderSW, encoderReS, bin, outFile)
	if err != nil {
		return nil, err
	}

	return os.ReadFile(outFile)
}

func runFFmpeg(ctx context.Context, enc, vf string, bin []byte, outFile string) error {
	svtav1Params := "null"
	if enc == encoderSW {
		svtav1Params = "avif=1:lp=4:la-depth=0:fast-decode=1"
	}

	cmd := exec.CommandContext(ctx, "ffmpeg",
		"-loglevel", "error",
		"-y",
		"-f", "image2pipe",
		"-i", "pipe:",
		"-c:v", enc,
		"-vf", vf,
		"-pix_fmt", "yuv444p10le",
		"-still-picture", "1",
		"-svtav1-params", svtav1Params,
		"-crf", "12",
		"-b:v", "0",
		outFile,
	)
	cmd.Stdin = bytes.NewReader(bin)
	var stderr bytes.Buffer
	cmd.Stderr = &stderr

	if err := cmd.Run(); err != nil {
		return fmt.Errorf("ffmpeg (%s): %w: %s", enc, err, stderr.String())
	}

	// Validate output file integrity
	validateCmd := exec.CommandContext(ctx, "ffmpeg",
		"-v", "error",
		"-i", outFile,
		"-f", "null",
		"-",
	)
	var valStderr bytes.Buffer
	validateCmd.Stderr = &valStderr

	if err := validateCmd.Run(); err != nil {
		return fmt.Errorf("ffmpeg validate (%s): %w: %s", enc, err, valStderr.String())
	}

	return nil
}

func checkPNGOpaqueness(bin []byte) bool {
	if err := EnsureVipsStarted(); err != nil {
		return false
	}

	img, err := vips.NewImageFromBuffer(bin)
	if err != nil {
		return false
	}
	defer img.Close()

	if !img.HasAlpha() {
		return true
	}

	bands := img.Bands()
	if bands < 2 {
		return true
	}

	alpha, err := img.ExtractBandToImage(bands-1, 1)
	if err != nil {
		return false
	}
	defer alpha.Close()

	minAlpha, _, _, err := alpha.Min()
	if err != nil {
		return false
	}

	return minAlpha >= 255
}
