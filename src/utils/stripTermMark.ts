/** Xóa ký hiệu [TERM:...] ở đầu description khi hiển thị */
export function stripTermMark(description?: string | null): string {
  if (!description) return '';
  return description.replace(/^\[TERM:(MID_1|FINAL_1|MID_2|FINAL_2)\]\s*/i, '').trim();
}
