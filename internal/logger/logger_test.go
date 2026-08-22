package logger

import (
	"fmt"
	"os"
	"path/filepath"
	"sync"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestNewDailyRotateWriter_EmptyDir(t *testing.T) {
	w, err := NewDailyRotateWriter("")
	assert.Error(t, err)
	assert.Nil(t, w)
}

func TestNewDailyRotateWriter_BasicWrite(t *testing.T) {
	tempDir := t.TempDir()
	fixedDate := time.Date(2026, 8, 22, 10, 0, 0, 0, time.UTC)

	w, err := NewDailyRotateWriterWithClock(tempDir, func() time.Time {
		return fixedDate
	})
	require.NoError(t, err)
	defer w.Close()

	expectedFilename := "booru_server_2026-08-22.log"
	assert.Equal(t, expectedFilename, w.CurrentFilename())
	assert.Equal(t, "2026-08-22", w.CurrentDay())

	testMsg := "Hello booru logger\n"
	n, err := w.Write([]byte(testMsg))
	require.NoError(t, err)
	assert.Equal(t, len(testMsg), n)

	filePath := filepath.Join(tempDir, expectedFilename)
	content, err := os.ReadFile(filePath)
	require.NoError(t, err)
	assert.Equal(t, testMsg, string(content))
}

func TestNewDailyRotateWriter_RelativePath(t *testing.T) {
	// Use relative path within a temporary subfolder
	relDir := filepath.Join(".", "test_rel_logs_"+fmt.Sprint(time.Now().UnixNano()))
	defer os.RemoveAll(relDir)

	w, err := NewDailyRotateWriter(relDir)
	require.NoError(t, err)
	defer w.Close()

	testMsg := "Testing relative path\n"
	_, err = w.Write([]byte(testMsg))
	require.NoError(t, err)

	absDir, _ := filepath.Abs(relDir)
	assert.Equal(t, absDir, w.Dir())

	today := time.Now().Format("2006-01-02")
	expectedFile := filepath.Join(absDir, fmt.Sprintf("booru_server_%s.log", today))
	assert.FileExists(t, expectedFile)

	content, err := os.ReadFile(expectedFile)
	require.NoError(t, err)
	assert.Equal(t, testMsg, string(content))
}

func TestDailyRotateWriter_DayRotation(t *testing.T) {
	tempDir := t.TempDir()
	currentDate := time.Date(2026, 8, 22, 23, 59, 50, 0, time.UTC)

	w, err := NewDailyRotateWriterWithClock(tempDir, func() time.Time {
		return currentDate
	})
	require.NoError(t, err)
	defer w.Close()

	// Write day 1 log
	day1Msg := "Log entry on day 1 (2026-08-22)\n"
	_, err = w.Write([]byte(day1Msg))
	require.NoError(t, err)

	// Advance time past midnight to day 2
	currentDate = time.Date(2026, 8, 23, 0, 0, 10, 0, time.UTC)

	day2Msg := "Log entry on day 2 (2026-08-23)\n"
	_, err = w.Write([]byte(day2Msg))
	require.NoError(t, err)

	assert.Equal(t, "2026-08-23", w.CurrentDay())
	assert.Equal(t, "booru_server_2026-08-23.log", w.CurrentFilename())

	// Advance time to day 3
	currentDate = time.Date(2026, 8, 24, 12, 0, 0, 0, time.UTC)

	day3Msg := "Log entry on day 3 (2026-08-24)\n"
	_, err = w.Write([]byte(day3Msg))
	require.NoError(t, err)

	// Verify day 1 file
	file1 := filepath.Join(tempDir, "booru_server_2026-08-22.log")
	content1, err := os.ReadFile(file1)
	require.NoError(t, err)
	assert.Equal(t, day1Msg, string(content1))

	// Verify day 2 file
	file2 := filepath.Join(tempDir, "booru_server_2026-08-23.log")
	content2, err := os.ReadFile(file2)
	require.NoError(t, err)
	assert.Equal(t, day2Msg, string(content2))

	// Verify day 3 file
	file3 := filepath.Join(tempDir, "booru_server_2026-08-24.log")
	content3, err := os.ReadFile(file3)
	require.NoError(t, err)
	assert.Equal(t, day3Msg, string(content3))
}

func TestDailyRotateWriter_ConcurrentWrites(t *testing.T) {
	tempDir := t.TempDir()
	w, err := NewDailyRotateWriter(tempDir)
	require.NoError(t, err)
	defer w.Close()

	const numGoroutines = 20
	const writesPerGoroutine = 50

	var wg sync.WaitGroup
	wg.Add(numGoroutines)

	for i := 0; i < numGoroutines; i++ {
		go func(id int) {
			defer wg.Done()
			for j := 0; j < writesPerGoroutine; j++ {
				line := fmt.Sprintf("goroutine %d: line %d\n", id, j)
				_, writeErr := w.Write([]byte(line))
				assert.NoError(t, writeErr)
			}
		}(i)
	}

	wg.Wait()

	today := time.Now().Format("2006-01-02")
	logFile := filepath.Join(tempDir, fmt.Sprintf("booru_server_%s.log", today))
	assert.FileExists(t, logFile)

	info, err := os.Stat(logFile)
	require.NoError(t, err)
	assert.Greater(t, info.Size(), int64(0))
}

func TestDailyRotateWriter_Close(t *testing.T) {
	tempDir := t.TempDir()
	w, err := NewDailyRotateWriter(tempDir)
	require.NoError(t, err)

	_, err = w.Write([]byte("First line\n"))
	require.NoError(t, err)

	// First Close should succeed
	err = w.Close()
	assert.NoError(t, err)

	// Second Close should be a no-op and succeed
	err = w.Close()
	assert.NoError(t, err)

	// Write after Close should fail
	_, err = w.Write([]byte("After close line\n"))
	assert.ErrorIs(t, err, os.ErrClosed)
}

func TestInitLogger_Stdout(t *testing.T) {
	closer, writer, err := InitLogger("")
	require.NoError(t, err)
	assert.Nil(t, closer)
	assert.Equal(t, os.Stdout, writer)
}

func TestInitLogger_WithLogsDir(t *testing.T) {
	tempDir := t.TempDir()
	closer, writer, err := InitLogger(tempDir)
	require.NoError(t, err)
	require.NotNil(t, closer)
	require.NotNil(t, writer)
	defer closer.Close()

	rotator, ok := writer.(*DailyRotateWriter)
	require.True(t, ok)
	assert.Equal(t, tempDir, rotator.Dir())
}
