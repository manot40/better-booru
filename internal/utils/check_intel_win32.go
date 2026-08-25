//go:build windows

package utils

import "syscall"

const intelVendorDLL = "intel_gfx_api-x64.dll"

func CheckIfIntelGPU() bool {
	handle, err := syscall.LoadDLL(intelVendorDLL)
	if err == nil {
		_ = handle.Release()
		return true
	}
	return false
}
