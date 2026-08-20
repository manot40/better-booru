package query

import (
	"strings"
)

// TagASTType represents the AST node type for tags.
type TagASTType string

const (
	TagASTTag   TagASTType = "tag"
	TagASTNot   TagASTType = "not"
	TagASTOr    TagASTType = "or"
	TagASTGroup TagASTType = "group"
)

// TagAST represents a parsed tag expression node.
type TagAST struct {
	Type  TagASTType `json:"type"`
	Value string     `json:"value,omitempty"` // For TagASTTag
	Child *TagAST    `json:"child,omitempty"` // For TagASTNot, TagASTOr
	Group []TagAST   `json:"group,omitempty"` // For TagASTGroup
}

// ParseResult holds the parsed AST and flat list of raw tag names.
type ParseResult struct {
	AST  []TagAST `json:"ast"`
	Tags []string `json:"tags"`
}

func isGroupEnding(s string) bool {
	return (strings.HasSuffix(s, ")") && !strings.Contains(s, "_")) || strings.HasSuffix(s, "))")
}

// ParseTags parses a Danbooru-style tag string with -, ~, and () modifiers.
func ParseTags(input string) ParseResult {
	tokens := strings.Split(input, " ")
	result := ParseResult{
		AST:  make([]TagAST, 0),
		Tags: make([]string, 0),
	}

	i := 0
	var parseExpr func(token string) *TagAST

	parseExpr = func(token string) *TagAST {
		if token == "" {
			return nil
		}

		firstChar := token[0]
		if firstChar != '-' && firstChar != '~' && firstChar != '(' {
			result.Tags = append(result.Tags, token)
			return &TagAST{Type: TagASTTag, Value: token}
		}

		val := token[1:]
		switch firstChar {
		case '-':
			child := parseExpr(val)
			if child == nil {
				return nil
			}
			return &TagAST{Type: TagASTNot, Child: child}

		case '~':
			child := parseExpr(val)
			if child == nil {
				return nil
			}
			return &TagAST{Type: TagASTOr, Child: child}

		case '(':
			isEnding := strings.HasSuffix(val, ")")
			nextToken := val
			members := make([]TagAST, 0)

			for {
				if isEnding {
					trimmed := nextToken[:len(nextToken)-1]
					member := parseExpr(trimmed)
					if member != nil {
						members = append(members, *member)
					}
					break
				}

				member := parseExpr(nextToken)
				if member != nil {
					members = append(members, *member)
				}

				i++
				if i >= len(tokens) {
					break
				}
				nextToken = strings.TrimSpace(tokens[i])
				if nextToken == "" {
					break
				}

				isEnding = isGroupEnding(nextToken)
			}

			return &TagAST{Type: TagASTGroup, Group: members}

		default:
			return nil
		}
	}

	for i < len(tokens) {
		sanitized := strings.TrimSpace(tokens[i])
		if sanitized != "" {
			node := parseExpr(sanitized)
			if node != nil {
				result.AST = append(result.AST, *node)
			}
		}
		i++
	}

	return result
}

// SerializeTags converts AST back into string representation.
func SerializeTags(exprs []TagAST) string {
	parts := make([]string, 0, len(exprs))
	for _, expr := range exprs {
		parts = append(parts, serializeTagExpr(expr))
	}
	return strings.Join(parts, " ")
}

func serializeTagExpr(expr TagAST) string {
	switch expr.Type {
	case TagASTTag:
		return expr.Value
	case TagASTNot:
		if expr.Child != nil {
			return "-" + serializeTagExpr(*expr.Child)
		}
		return ""
	case TagASTOr:
		if expr.Child != nil {
			return "~" + serializeTagExpr(*expr.Child)
		}
		return ""
	case TagASTGroup:
		subParts := make([]string, 0, len(expr.Group))
		for _, m := range expr.Group {
			subParts = append(subParts, serializeTagExpr(m))
		}
		return "(" + strings.Join(subParts, " ") + ")"
	default:
		return ""
	}
}
