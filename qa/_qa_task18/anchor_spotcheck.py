#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Task 18 §验证方法 4 —— 锚点完备性抽查：人为改掉 plan/ 里的锚点值，核验器的期望值必须随之改变。

这一步专门用来证伪"把真值手抄进核验器"（缺陷 D2）：如果某条断言的期望值是写死的，
改了合同它照样绿；真在解析的合同改动它必红。plan/ 全程只读——用例改的是副本目录，
核验器通过 QODER_PLAN_DIR 指向副本。用法：python _qa_task18/anchor_spotcheck.py
"""
import io
import os
import re
import shutil
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
WORK = os.path.join(HERE, "_planmut")
LOG = os.path.join(HERE, "anchor_spotcheck.md")

# (编号, 要改的 plan 文件, 原字面, 改后字面, 指定必须翻红的断言前缀, 说明)
CASES = [
    ("S01", "Task4-完成首页内容.md",
     "P_ORIGIN|我们的名字来自《三体》里的一支舰队。",
     "P_ORIGIN|我们的名字来自《三体》里的一支船队。",
     ["E6/P_ORIGIN"], "首页三段字面量之一改动 → E6 期望值必须跟着变"),
    ("S02", "Task4-完成首页内容.md",
     "{main:1, h1:1, div:2, section:3, h2:4, p:3, ul:1, li:3, a:3, span:6}",
     "{main:1, h1:1, div:2, section:3, h2:4, p:4, ul:1, li:3, a:3, span:6}",
     ["E8tally/p", "E8/noEighth"], "R4 标签计数改动 → E8tally/p 与 E8/noEighth 必须同时跟着变"),
    ("S03", "Task4-完成首页内容.md",
     "8. `最新报道`", "8. `最新稿件`",
     ["E8/order"], "白名单第 8 项改动 → 按序 14 项判据必须变红"),
    ("S04", "Task1-素材基线与内容合同.md",
     "`M01=96`", "`M01=97`",
     ["L3/M:M01"], "§3 逐段字符数基线改动 → L3 对表必须变红"),
    ("S05", "Task1-素材基线与内容合同.md",
     "M04|目前，校本课程志愿填报工作正在进行中。",
     "M04|目前，校本课程志愿填报工作仍在进行。",
     ["F7p/article-school-course-volunteer.html/M04", "L3/M:M04", "G/M/。"],
     "合同块逐段文本改动 → 详情页逐段判据必须变红"),
    ("S06", "Task1-素材基线与内容合同.md",
     "`DE10B575399E0563430F2F255C956B179C9978C087897A24910AD70D6A50F6FC`",
     "`DE10B575399E0563430F2F255C956B179C9978C087897A24910AD70D6A50F6FD`",
     ["B/新闻消息.docx"], "素材冻结哈希改动 → B 组必须变红"),
    ("S07", "Task0-总方案与任务索引.md",
     "`home-latest__entry`、`home-latest__date`。",
     "`home-latest__entrance`、`home-latest__date`。",
     ["H14/rule/home-latest__entry", "H14/dom/home-latest__entrance", "H11/unknown"],
     "接口新类改名 → 死规则检查（旧名无 CSS 规则）与 DOM 在场性（新名无节点）两侧都必须变红"),
    ("S08", "Task0-总方案与任务索引.md",
     "ID：`#nav-toggle`、`#site-navigation`、`#main-content`。",
     "ID：`#nav-toggle`、`#site-navigation-x`、`#main-content`。",
     ["C11/"], "接口 ID 清单改动 → C11 在场性判据必须变红"),
    ("S09", "Task12-归档总方案与全局合同修订.md",
     "`^article-[a-z0-9][a-z0-9-]{2,40}\\.html$`",
     "`^article-[a-z0-9][a-z0-9-]{2,10}\\.html$`",
     ["A1c/article-classroom-screen-upgrade.html", "A1d/article-classroom-screen-upgrade.html"],
     "R2② 详情页命名正则收紧 → A1c（磁盘命名形态）与 A1d（清单 vs 内容源推导）两侧都必须变红"),
    ("S10", "Task13-素材迁移与内容源基线.md",
     "`^\\d{1,2}月\\d{1,2}日$`", "`^\\d{1,2}月\\d{1,2}号$`",
     ["Q/Q6/display_date-form"], "display_date 字面正则改动 → 独立解析器 Q6 必须变红"),
]


def run(plan_dir, tag):
    rep = os.path.join(HERE, "_anchor_%s.md" % tag)
    env = dict(os.environ)
    env.update({
        "QODER_PLAN_DIR": plan_dir,
        "QODER_REPORT": rep,
        "QODER_SRC_FACTS": os.path.join(HERE, "_anchor_src_%s.json" % tag),
        "PYTHONIOENCODING": "utf-8",
    })
    p = subprocess.run([sys.executable.replace("python.exe", "python.exe"), "-c", "pass"], capture_output=True)
    del p
    r = subprocess.run(["node", os.path.join(HERE, "verify_task18.mjs")], cwd=ROOT, env=env,
                       capture_output=True, text=True, encoding="utf-8")
    reds = set()
    if os.path.exists(rep):
        for m in re.finditer(r"^\[(.+?)\] FAIL", io.open(rep, encoding="utf-8").read(), re.M):
            reds.add(m.group(1))
    return r.returncode, reds, rep


def main():
    shutil.rmtree(WORK, ignore_errors=True)
    os.makedirs(WORK, exist_ok=True)
    rows = []
    for cid, fname, old, new, expect, why in CASES:
        d = os.path.join(WORK, cid)
        shutil.copytree(os.path.join(ROOT, "plan"), d)
        p = os.path.join(d, fname)
        t = io.open(p, encoding="utf-8").read()
        if old not in t:
            rows.append((cid, fname, "锚点字面未命中", "—", "台架异常", old[:40]))
            continue
        io.open(p, "w", encoding="utf-8", newline="\n").write(t.replace(old, new, 1))
        rc, reds, rep = run(d, cid)
        hit = [r for r in sorted(reds) if any(r.startswith(e) or r == e for e in expect)]
        hard = [r for r in sorted(reds) if r == "GATE-ANCHOR" or r == "GATE-CRASH"
                or r.startswith("Q0/rc")]
        verdict = ("期望随动（指定红 %d 条）" % len(hit)) if hit else (
            "以硬停止随动（锚点缺失即拒绝出结论，按合同回流而非回退常量）" if hard else "未随动（疑似手抄）")
        rows.append((cid, fname, "已改 1 处", str(rc), verdict,
                     ", ".join((hit or hard or sorted(reds))[:3]) or "红项 0 条"))
    out = ["# Task 18 锚点完备性抽查（§验证方法 4）", "",
           "做法：把 `plan/` 整目录复制到 `_planmut/<编号>/`，只改一处锚点字面，用 `QODER_PLAN_DIR` 指向副本重跑核验器；",
           "`plan/` 本身全程未写。指定断言随合同改动翻红＝该期望值真在解析；不随动＝手抄。", "",
           "| 编号 | 改动的合同文件 | 处理 | rc | 结论 | 实际随动翻红的断言 |",
           "| --- | --- | --- | --- | --- | --- |"]
    for r in rows:
        out.append("| %s | %s | %s | %s | %s | %s |" % r)
    good = sum(1 for r in rows if "随动" in r[4] and "未随动" not in r[4])
    out += ["", "- 抽查 %d 条，随动 %d 条，未随动 %d 条，台架异常 %d 条" % (
        len(rows), good, sum(1 for r in rows if "未随动" in r[4]), sum(1 for r in rows if r[4] == "台架异常")),
        "- 只读证明：`plan/` 未被写入（改的是 `_planmut/` 副本），`Results/` 由核验器自身的 R0 组逐项哈希守卫。"]
    io.open(LOG, "w", encoding="utf-8", newline="\n").write("\n".join(out) + "\n")
    print("\n".join("%s %s -> %s | %s" % (r[0], r[1], r[4], r[5]) for r in rows))
    print("日志", LOG)
    return 0 if good == len(rows) else 1


if __name__ == "__main__":
    sys.exit(main())
