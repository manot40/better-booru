//go:build !windows

package utils

import (
	"os"
	"path/filepath"
	"strings"
)

const intelVendorIDHex = "0x8086"

func CheckIfIntelGPU() bool {
	drmDevices, err := filepath.Glob("/sys/class/drm/card[0-9]*/device/vendor")
	if err != nil {
		return false
	}

	for _, path := range drmDevices {
		data, err := os.ReadFile(path)
		if err != nil {
			continue
		}

		vendorID := strings.TrimSpace(string(data))
		if strings.EqualFold(vendorID, intelVendorIDHex) {
			return true
		}
	}
	return false
}
