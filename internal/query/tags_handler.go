package query

import (
	"context"
	"fmt"
	"strings"

	"github.com/manot40/better-booru/internal/db"
	"github.com/uptrace/bun"
)

// IsMetaTag checks whether the tag category represents a metadata tag.
// Category 0 is general tag, whereas 1=artist, 3=copyright, 4=character, 5=meta.
func IsMetaTag(category int16) bool {
	return category != 0
}

type tagInfo struct {
	ID     int
	IsMeta bool
}

type tagsFilter struct {
	EQ []int
	NE []int
}

// ApplyTagsFilter applies tag search conditions to a bun.SelectQuery.
func ApplyTagsFilter(ctx context.Context, bunDB *bun.DB, q *bun.SelectQuery, tagString string) (*bun.SelectQuery, error) {
	if strings.TrimSpace(tagString) == "" {
		return q, nil
	}

	parseRes := ParseTags(tagString)
	if len(parseRes.Tags) == 0 {
		return q, nil
	}

	var tagsInDB []db.Tag
	err := bunDB.NewSelect().
		Model(&tagsInDB).
		Where("name IN (?)", bun.List(parseRes.Tags)).
		Scan(ctx)
	if err != nil {
		return nil, fmt.Errorf("querying tags: %w", err)
	}

	tagsMap := make(map[string]tagInfo, len(tagsInDB))
	for _, t := range tagsInDB {
		tagsMap[t.Name] = tagInfo{ID: t.ID, IsMeta: IsMetaTag(t.Category)}
	}

	andOp := map[string]*tagsFilter{
		"tags": {},
		"meta": {},
	}
	orOp := map[string][]int{
		"tags": {},
		"meta": {},
	}

	var walkAST func(ast TagAST, ctxType TagASTType)
	walkAST = func(ast TagAST, ctxType TagASTType) {
		if ctxType == ast.Type {
			return
		}

		switch ast.Type {
		case TagASTTag:
			info, ok := tagsMap[ast.Value]
			if !ok {
				return
			}
			key := "tags"
			if info.IsMeta {
				key = "meta"
			}

			if ctxType == TagASTOr {
				orOp[key] = append(orOp[key], info.ID)
			} else {
				if ctxType == TagASTNot {
					andOp[key].NE = append(andOp[key].NE, info.ID)
				} else {
					andOp[key].EQ = append(andOp[key].EQ, info.ID)
				}
			}

		case TagASTNot, TagASTOr:
			if ast.Child != nil {
				walkAST(*ast.Child, ast.Type)
			}

		case TagASTGroup:
			for _, m := range ast.Group {
				walkAST(m, ctxType)
			}
		}
	}

	for _, node := range parseRes.AST {
		walkAST(node, "")
	}

	// Apply AND filters
	for key, val := range andOp {
		col := "p.tag_ids"
		if key == "meta" {
			col = "p.meta_ids"
		}

		if len(val.EQ) > 0 {
			q = q.Where(fmt.Sprintf("%s @> ARRAY[?]::integer[]", col), bun.List(val.EQ))
		}
		if len(val.NE) > 0 {
			q = q.Where(fmt.Sprintf("NOT (%s && ARRAY[?]::integer[])", col), bun.List(val.NE))
		}
	}

	// Apply OR filters
	var orClauses []string
	var orArgs []any

	for key, ids := range orOp {
		if len(ids) == 0 {
			continue
		}
		col := "p.tag_ids"
		if key == "meta" {
			col = "p.meta_ids"
		}
		orClauses = append(orClauses, fmt.Sprintf("%s && ARRAY[?]::integer[]", col))
		orArgs = append(orArgs, bun.List(ids))
	}

	if len(orClauses) > 0 {
		combinedOR := strings.Join(orClauses, " OR ")
		q = q.Where(fmt.Sprintf("(%s)", combinedOR), orArgs...)
	}

	return q, nil
}
