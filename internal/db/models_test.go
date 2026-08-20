package db_test

import (
	"testing"

	"github.com/manot40/better-booru/internal/config"
	"github.com/manot40/better-booru/internal/db"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestConnect_Noop(t *testing.T) {
	cfg := &config.Config{
		DatabaseURL: "",
	}
	bunDB, err := db.Connect(cfg, false)
	require.NoError(t, err)
	assert.Nil(t, bunDB)

	cfg.DatabaseURL = "noop"
	bunDB, err = db.Connect(cfg, false)
	require.NoError(t, err)
	assert.Nil(t, bunDB)
}
