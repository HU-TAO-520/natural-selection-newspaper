# Task 10 核验器变异对照（证明断言非空跑）

| 变异 | 注入的违约 | 期望翻红 | 实际 | 结论 |
| --- | --- | --- | --- | --- |
| charset | index.html | C2/ | C2/（共 4 项 FAIL） | 捕获 |
| title-sep | news-feature.html | C3/ | C3/（共 2 项 FAIL） | 捕获 |
| css-ref-query | news-message.html | C4/ | C4/（共 5 项 FAIL） | 捕获 |
| inline-script | news-commentary.html | C4/, K1/ | C4/, K1/（共 4 项 FAIL） | 捕获 |
| skip-text | index.html | C5/ | C5/（共 3 项 FAIL） | 捕获 |
| expanded-true | news-commentary.html | C7/news-commentary.html/expanded-src | C7/news-commentary.html/expanded-src（共 2 项 FAIL） | 捕获 |
| icon-no-hidden | news-message.html | C7/ | C7/（共 3 项 FAIL） | 捕获 |
| nav-hidden | news-feature.html | C8/ | C8/（共 3 项 FAIL） | 捕获 |
| main-tabindex | index.html | C9/ | C9/（共 2 项 FAIL） | 捕获 |
| dup-id | news-commentary.html | C10/ | C10/（共 6 项 FAIL） | 捕获 |
| nav-order | news-message.html | D1/ | D1/（共 5 项 FAIL） | 捕获 |
| nav-abs-path | news-feature.html | D2, D1/ | D2, D1/（共 4 项 FAIL） | 捕获 |
| current-on-li | news-message.html | D3/, D4/ | D3/, D4/（共 4 项 FAIL） | 捕获 |
| home-swap | index.html | E2/order | E2/order（共 3 项 FAIL） | 捕获 |
| home-text-year | index.html | E6/P_FOUNDED | E6/P_FOUNDED（共 4 项 FAIL） | 捕获 |
| home-text-space | index.html | E6/P_FOUNDED | E6/P_FOUNDED（共 6 项 FAIL） | 捕获 |
| home-slot | index.html | E7, J4 | E7, J4（共 8 项 FAIL） | 捕获 |
| home-extra-p | index.html | E8 | E8（共 4 项 FAIL） | 捕获 |
| home-drop-h2 | index.html | E3, E4, E5 | E3, E4, E5（共 8 项 FAIL） | 捕获 |
| msg-char | news-message.html | F7/news-message.html | F7/news-message.html（共 2 项 FAIL） | 捕获 |
| msg-truncate | news-message.html | F7/news-message.html, F7/news-message.html/chars | F7/news-message.html, F7/news-message.html/chars（共 3 项 FAIL） | 捕获 |
| feat-merge | news-feature.html | F6/, F7/ | F6/, F7/（共 4 项 FAIL） | 捕获 |
| dateline-2sp | news-message.html | F8/, F11 | F8/, F11（共 6 项 FAIL） | 捕获 |
| dateline-nbsp | news-feature.html | F8/ | F8/（共 5 项 FAIL） | 捕获 |
| dateline-nowrap | news-feature.html | F8/, F10/ | F8/, F10/（共 6 项 FAIL） | 捕获 |
| comm-date-into-body | news-commentary.html | F1/, F9/ | F1/, F9/（共 6 项 FAIL） | 捕获 |
| comm-date-year | news-commentary.html | F9/, J2 | F9/, J2（共 4 项 FAIL） | 捕获 |
| comm-exe-nodot | news-commentary.html | G3 | G3（共 4 项 FAIL） | 捕获 |
| comm-space-in-word | news-commentary.html | G3 | G3（共 4 项 FAIL） | 捕获 |
| comm-blank-line | news-commentary.html | F6/, F7/, F11 | F6/, F7/, F11（共 7 项 FAIL） | 捕获 |
| feat-ai-case | news-feature.html | G2 | G2（共 4 项 FAIL） | 捕获 |
| feat-pronoun | news-feature.html | F7/, G2/pron | F7/, G2/pron（共 3 项 FAIL） | 捕获 |
| byline-author | news-message.html | F5/, J7 | F5/, J7（共 4 项 FAIL） | 捕获 |
| source-name | news-commentary.html | J3, F3/ | J3, F3/（共 5 项 FAIL） | 捕获 |
| hash-leak | news-message.html | J6 | J6（共 4 项 FAIL） | 捕获 |
| extra-file | static | A1, A2 | A1, A2（共 3 项 FAIL） | 捕获 |
| subdir | static | A2 | A2（共 1 项 FAIL） | 捕获 |
| materials-tamper | materials | B2 | B2（共 2 项 FAIL） | 捕获 |
| nav-item-missing | index.html | C8/, D1/, D2 | C8/, D1/, D2（共 6 项 FAIL） | 捕获 |
| para-reorder | news-feature.html | F7/ | F7/（共 4 项 FAIL） | 捕获 |
| home-lab-unresolved | index.html | E4/labelledby | E4/labelledby（共 2 项 FAIL） | 捕获 |
| css-important | styles.css | H5/important | H5/important（共 2 项 FAIL） | 捕获 |
| css-id-selector | styles.css | H5/id | H5/id（共 4 项 FAIL） | 捕获 |
| css-shadow | styles.css | H7 | H7（共 4 项 FAIL） | 捕获 |
| css-radius | styles.css | H7 | H7（共 4 项 FAIL） | 捕获 |
| css-external | styles.css | H2 | H2（共 7 项 FAIL） | 捕获 |
| css-wrong-breakpoint | styles.css | H8 | H8（共 3 项 FAIL） | 捕获 |
| css-second-media | styles.css | H8 | H8（共 3 项 FAIL） | 捕获 |
| css-mobile-100vw | styles.css | H9 | H9（共 2 项 FAIL） | 捕获 |
| css-content-inject | styles.css | H10 | H10（共 5 项 FAIL） | 捕获 |
| css-new-class | styles.css | H11 | H11（共 4 项 FAIL） | 捕获 |
| css-unbalanced | styles.css | H12 | H12（共 5 项 FAIL） | 捕获 |
| css-var-drift | styles.css | H4 | H4（共 2 项 FAIL） | 捕获 |
| js-console | script.js | I3 | I3（共 2 项 FAIL） | 捕获 |
| js-breakpoint-rem | script.js | I4 | I4（共 2 项 FAIL） | 捕获 |
| js-innerwidth | script.js | I4 | I4（共 2 项 FAIL） | 捕获 |
| js-outside-click | script.js | I9 | I9（共 2 项 FAIL） | 捕获 |
| js-extra-state | script.js | I5 | I5（共 3 项 FAIL） | 捕获 |
| js-remote | script.js | I2 | I2（共 3 项 FAIL） | 捕获 |
| js-early-nojs | script.js | I7 | I7（共 2 项 FAIL） | 捕获 |
| js-internal-ids | script.js | I8 | I8（共 3 项 FAIL） | 捕获 |

- 变异体总数：61　捕获：61　未捕获/崩溃：0
- 全部变异体均写入 _qa_task10\mutants\，真实 Results/ 与 Materials/ 未被触碰（见 A5 复核）。