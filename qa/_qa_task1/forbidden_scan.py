# -*- coding: utf-8 -*-
"""Task 1 禁止项验证：确认风险元数据只存在于 plan/ 与 _qa_task1/，Results/ 为 0 命中。"""
import io
import json
import sys
from pathlib import Path

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
ROOT = Path(__file__).resolve().parent.parent
TERMS = ["厨一枚", "胡桃", "2026", "新闻评价", "M01", "F01", "C01", "closing_date",
         "作者：", "记者：", "评论员：", "来源：", "出处：", "Materials/", ".docx",
         "DE10B575", "0C5B3525", "8E50CFC8", "TODO", "待补充"]

res = ROOT / "Results"
scan_targets = sorted(p for p in res.rglob("*") if p.is_file())
lines = ["Results/ 待扫描文件数: %d %s" % (len(scan_targets),
         json.dumps([p.name for p in scan_targets], ensure_ascii=False)), ""]
total = 0
for term in TERMS:
    hits = []
    for p in scan_targets:
        try:
            txt = p.read_text(encoding="utf-8", errors="strict")
        except Exception:
            txt = p.read_bytes().decode("utf-8", errors="replace")
        c = txt.count(term)
        if c:
            hits.append((p.name, c))
            total += c
    lines.append("  %-14s -> %d 命中 %s" % (term, sum(h[1] for h in hits), json.dumps(hits, ensure_ascii=False)))
lines.append("")
lines.append("Results/ 禁止项总命中: %d  =>  %s" % (total, "PASS (0)" if total == 0 else "FAIL"))

# 反向确认：风险词确实存在于 plan/（说明它是被登记的内部风险说明，而非遗漏）
plan = ROOT / "plan"
for term in ["厨一枚", "2026", "新闻评价"]:
    where = [str(p.relative_to(ROOT)) for p in sorted(plan.rglob("*.md"))
             if term in p.read_text(encoding="utf-8")]
    lines.append("  plan/ 含 %-8s 的文件: %s" % (term, json.dumps(where, ensure_ascii=False)))

out = "\n".join(lines)
(ROOT / "_qa_task1" / "report3.txt").write_text(out, encoding="utf-8")
print(out)
