package query_test

import (
	"testing"

	"github.com/manot40/better-booru/internal/query"
	"github.com/stretchr/testify/assert"
)

func TestParseTags_Plain(t *testing.T) {
	res := query.ParseTags("1girl solo blue_hair")
	assert.Equal(t, []string{"1girl", "solo", "blue_hair"}, res.Tags)
	assert.Len(t, res.AST, 3)
	assert.Equal(t, query.TagASTTag, res.AST[0].Type)
	assert.Equal(t, "1girl", res.AST[0].Value)
}

func TestParseTags_Modifiers(t *testing.T) {
	res := query.ParseTags("1girl -rating:explicit ~smile")
	assert.Equal(t, []string{"1girl", "rating:explicit", "smile"}, res.Tags)
	assert.Len(t, res.AST, 3)

	assert.Equal(t, query.TagASTTag, res.AST[0].Type)
	assert.Equal(t, "1girl", res.AST[0].Value)

	assert.Equal(t, query.TagASTNot, res.AST[1].Type)
	assert.NotNil(t, res.AST[1].Child)
	assert.Equal(t, "rating:explicit", res.AST[1].Child.Value)

	assert.Equal(t, query.TagASTOr, res.AST[2].Type)
	assert.NotNil(t, res.AST[2].Child)
	assert.Equal(t, "smile", res.AST[2].Child.Value)
}

func TestParseTags_Groups(t *testing.T) {
	res := query.ParseTags("(tag1 tag2)")
	assert.Equal(t, []string{"tag1", "tag2"}, res.Tags)
	assert.Len(t, res.AST, 1)
	assert.Equal(t, query.TagASTGroup, res.AST[0].Type)
	assert.Len(t, res.AST[0].Group, 2)
}

func TestParseTags_SeriesParenthesis(t *testing.T) {
	// Danbooru tags like fate_(series)
	res := query.ParseTags("solo fate_(series) (tag1 tag2)")
	assert.Equal(t, []string{"solo", "fate_(series)", "tag1", "tag2"}, res.Tags)
	assert.Len(t, res.AST, 3)
}

func TestSerializeTags(t *testing.T) {
	input := "1girl -explicit ~smile (tag1 tag2)"
	res := query.ParseTags(input)
	serialized := query.SerializeTags(res.AST)
	assert.Equal(t, input, serialized)
}
