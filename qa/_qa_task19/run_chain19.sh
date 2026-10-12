#!/usr/bin/env bash
# Task 19 一次性链式跑：仪器取证 → 整站 all → 逐段（供一致性差分）→ 两段一致性 → 十例变异 → 日志。
# 每一级的退出码单独落在自己的文件里；任何一级红就停在那一级的证据上，不Chain 掩盖。
set -u
cd "$(dirname "$0")/.." || exit 9
echo "STAGE zoom_probe $(date +%H:%M:%S)"
node _qa_task19/zoom_probe19.mjs > _qa_task19/zoom_probe_run.txt 2>&1; echo "ZOOM_EXIT=$? $(date +%H:%M:%S)" >> _qa_task19/zoom_probe_run.txt
echo "STAGE narrow_probe $(date +%H:%M:%S)"
node _qa_task19/probe_page19.mjs > _qa_task19/narrow_probe_run.txt 2>&1; echo "PROBE_EXIT=$? $(date +%H:%M:%S)" >> _qa_task19/narrow_probe_run.txt
echo "STAGE all $(date +%H:%M:%S)"
QODER_PASS=all QODER_CDP_PORT=9381 node _qa_task19/cdp_regression19.mjs > _qa_task19/full_run_stdout.txt 2>&1
echo "ALL_EXIT=$?" >> _qa_task19/full_run_stdout.txt
for s in load nav desktop mobile tap tri interact cross zoom degrade content list pressure visited visited-pixel visual online; do
  echo "STAGE seg $s $(date +%H:%M:%S)"
  QODER_PASS="$s" QODER_TAG="-seg-$s" QODER_CDP_PORT=9382 node _qa_task19/cdp_regression19.mjs > "_qa_task19/seg_$s.txt" 2>&1
  echo "SEG_EXIT $s=$?" >> "_qa_task19/seg_$s.txt"
done
node _qa_task19/consistency19.mjs > _qa_task19/consistency_run.txt 2>&1
echo "CONS_EXIT=$?" >> _qa_task19/consistency_run.txt
node _qa_task19/mutate_task19.mjs > _qa_task19/mutation_run.txt 2>&1
echo "MUT_EXIT=$?" >> _qa_task19/mutation_run.txt
node _qa_task19/make_mutation_log19.mjs >> _qa_task19/mutation_run.txt 2>&1
echo "MUTLOG_EXIT=$?" >> _qa_task19/mutation_run.txt
echo "CHAIN DONE $(date +%H:%M:%S)" >> _qa_task19/full_run_stdout.txt
