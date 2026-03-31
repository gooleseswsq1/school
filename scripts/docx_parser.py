#!/usr/bin/env python3
"""
DOCX Exam Parser - Parse file Word đề thi, detect underline formatting để lấy đáp án.

Supports:
- MCQ (Câu 1-12): answer = option letter có gạch chân
- TF4 (Câu 13-16): label gạch chân = ĐÚNG, không gạch = SAI
- SAQ (Câu 17-22): answer nằm sau dòng "Đáp án:"

Output: JSON array of ClientQuestion objects
"""

import sys
import os
import json
import re

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

try:
    from docx import Document
    from docx.oxml.ns import qn
except ImportError:
    print(json.dumps({"error": "python-docx not installed. Run: pip install python-docx"}))
    sys.exit(1)


def is_run_underlined(run) -> bool:
    rPr = run._element.find(qn('w:rPr'))
    if rPr is not None:
        u_elem = rPr.find(qn('w:u'))
        if u_elem is not None:
            val = u_elem.get(qn('w:val'))
            return val != 'none'
    return False


def parse_docx(filepath: str) -> dict:
    if not os.path.exists(filepath):
        return {"error": f"File not found: {filepath}"}
    try:
        doc = Document(filepath)
    except Exception as e:
        return {"error": f"Cannot open DOCX: {str(e)}"}

    questions = []
    current_q = None
    q_regex = re.compile(r'^Câu\s*(\d+)\s*[:.)\-]?\s*(?:\[(TF4|TF|SAQ|TL|MCQ)\]\s*)?(.*)$', re.IGNORECASE)
    q_regex_alt = re.compile(r'^Câu\s*(\d+)\s*\((TF4|TF|SAQ|TL|MCQ)\)\s*[:.)\-]?\s*(.*)$', re.IGNORECASE)
    opt_regex = re.compile(r'^([A-D])\.\s*(.+)$')
    sub_regex = re.compile(r'^([a-d])\)\s*(.+)$', re.IGNORECASE)
    ans_regex = re.compile(r'^Đáp\s*án\s*(?:đúng)?\s*[:\-]?\s*(.*)$', re.IGNORECASE)

    def analyze_runs(para):
        runs_info = []
        for run in para.runs:
            if run.text.strip():
                runs_info.append({'text': run.text, 'underlined': is_run_underlined(run), 'bold': run.bold == True})
        return runs_info

    for para in doc.paragraphs:
        text = para.text.strip()
        if not text:
            continue
        q_match = q_regex.match(text) or q_regex_alt.match(text)
        if q_match:
            if current_q:
                questions.append(current_q)
            num = int(q_match.group(1))
            hint = (q_match.group(2) or '').upper()
            q_text = q_match.group(3) or ''
            current_q = {'num': num, 'hint': hint, 'text': q_text, 'runs': analyze_runs(para), 'options': [], 'sub_items': [], 'answer': '', 'saq_answer': '', '_expect_saq_answer_next': False}
            if hint == 'SAQ':
                saq_match = re.search(r'[.?]\s*(\d+[,.]?\d*)\s*$', q_text)
                if saq_match:
                    current_q['saq_answer'] = saq_match.group(1)
            continue
        if not current_q:
            continue
        opt_match = opt_regex.match(text)
        if opt_match:
            current_q['options'].append({'letter': opt_match.group(1), 'text': opt_match.group(2), 'runs': analyze_runs(para)})
            continue
        sub_match = sub_regex.match(text)
        if sub_match:
            current_q['sub_items'].append({'label': sub_match.group(1).lower(), 'text': sub_match.group(2), 'runs': analyze_runs(para)})
            continue
        ans_match = ans_regex.match(text)
        if ans_match:
            current_q['_expect_saq_answer_next'] = True
            continue
        if current_q.get('_expect_saq_answer_next'):
            current_q['saq_answer'] = text.strip()
            current_q['_expect_saq_answer_next'] = False
            continue
        current_q['runs'].extend(analyze_runs(para))
        if current_q['hint'] == 'SAQ':
            saq_ans_match = re.search(r'[.?]\s*(\d+[,.]?\d*)\s*$', text)
            if saq_ans_match:
                current_q['saq_answer'] = saq_ans_match.group(1)

    if current_q:
        questions.append(current_q)

    results = []
    for q in questions:
        q_type, answer, options_list, sub_items_list = '', '', [], []
        if q['hint'] == 'TF4': q_type = 'tf4'
        elif q['hint'] == 'SAQ': q_type = 'saq'
        elif q['hint'] == 'TL': q_type = 'essay'
        elif q['hint'] == 'TF': q_type = 'tf'
        elif q['hint'] == 'MCQ': q_type = 'mcq'
        elif len(q['options']) >= 2: q_type = 'mcq'
        elif len(q['sub_items']) > 0: q_type = 'tf4'
        else: q_type = 'essay'

        if q_type == 'mcq' and q['options']:
            for opt in q['options']:
                if any(r['underlined'] for r in opt['runs']):
                    answer = opt['letter']
                    break
            options_list = [o['text'] for o in q['options']]

        if q_type == 'tf4' and q['sub_items']:
            tf4_map = {}
            for sub in q['sub_items']:
                label_ul = any(r['underlined'] for r in sub['runs'] if sub['label'] in r['text'])
                tf4_map[sub['label']] = 'Đúng' if label_ul else 'Sai'
            answer = json.dumps(tf4_map, ensure_ascii=False)
            sub_items_list = [{'label': s['label'], 'text': s['text'], 'answer': tf4_map.get(s['label'], '')} for s in q['sub_items']]

        if q_type == 'saq':
            answer = q.get('saq_answer', '')

        if q_type == 'tf':
            for r in q['runs']:
                if r['underlined'] and re.match(r'^(Đúng|Sai|True|False)$', r['text'].strip(), re.IGNORECASE):
                    answer = r['text'].strip()
                    break

        results.append({
            'num': q['num'], 'type': q_type, 'text': q['text'], 'options': options_list,
            'subItems': sub_items_list, 'answer': answer,
            'status': 'ok' if answer else 'warn', 'warnMsg': '' if answer else 'Không tìm thấy đáp án',
        })

    return {
        'questions': results, 'total': len(results),
        'matrix': {
            'mcq': sum(1 for q in results if q['type'] == 'mcq'),
            'tf': sum(1 for q in results if q['type'] in ('tf', 'tf4')),
            'saq': sum(1 for q in results if q['type'] == 'saq'),
            'essay': sum(1 for q in results if q['type'] == 'essay'),
        }
    }


if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Usage: python docx_parser.py <file.docx>")
        sys.exit(1)
    filepath = sys.argv[1]
    result = parse_docx(filepath)
    print(json.dumps(result, ensure_ascii=False, indent=2))