"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

const B  = "#1A56DB";
const BL = "#EEF4FF";
const BB = "#C3D5FF";

const SUBJECTS = ["Toán","Ngữ văn","Tiếng Anh","Vật lý","Hóa học","Sinh học","Lịch sử","Địa lý","GDCD","Tin học","Thể dục","Âm nhạc","Mỹ thuật","Công nghệ"];
const LEVELS   = ["Cấp 1 (Tiểu học)","Cấp 2 (THCS)","Cấp 3 (THPT)"];

interface SchoolResult { id: string; name: string; address?: string }
interface FormData {
  role: "TEACHER" | "STUDENT" | "ADMIN" | "";
  name: string; email: string; password: string;
  schoolId: string; schoolName: string; level: string;
  subjects: string[];
  className: string; // học sinh điền tên lớp (vd: 10A1)
  activationCode: string; // giáo viên/admin nhập mã kích hoạt hoặc mã bootstrap
}

function FadeField({ delay = 0, label, visible, required, hint, children }: {
  delay?: number; label: string; visible: boolean;
  required?: boolean; hint?: string; children: React.ReactNode;
}) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (!visible) { setShow(false); return; }
    const t = setTimeout(() => setShow(true), delay);
    return () => clearTimeout(t);
  }, [visible, delay]);
  if (!show) return null;
  return (
    <div style={{ animation: "fadeSlide 0.4s cubic-bezier(0.4,0,0.2,1) both" }}>
      <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: B, marginBottom: 6 }}>
        {label}{required && <span style={{ color: "#e53e3e", marginLeft: 3 }}>*</span>}
      </label>
      {children}
      {hint && <p style={{ fontSize: 11.5, color: "#9ca3af", margin: "4px 0 0" }}>{hint}</p>}
    </div>
  );
}

export default function RegisterForm() {
  const router = useRouter();
  const adminBootstrapEnabled = process.env.NEXT_PUBLIC_ENABLE_ADMIN_BOOTSTRAP === "true";
  const [step, setStep]       = useState(1);
  const [stepKey, setStepKey] = useState(0);
  const [vis, setVis]         = useState(true);
  const [form, setForm]       = useState<FormData>({
    role: "", name: "", email: "", password: "",
    schoolId: "", schoolName: "", level: "",
    subjects: [], className: "", activationCode: "",
  });
  const [schoolQuery, setSchoolQuery]     = useState("");
  const [schoolResults, setSchoolResults] = useState<SchoolResult[]>([]);
  const [showDrop, setShowDrop]           = useState(false);
  const [loading, setLoading]             = useState(false);
  const [error, setError]                 = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isAdminRole = form.role === "ADMIN";
  const roleOptions = adminBootstrapEnabled
    ? (["TEACHER", "STUDENT", "ADMIN"] as const)
    : (["TEACHER", "STUDENT"] as const);

  const set = <K extends keyof FormData>(k: K, v: FormData[K]) => setForm(f => ({ ...f, [k]: v }));
  const toggleSubject = (s: string) =>
    set("subjects", form.subjects.includes(s) ? form.subjects.filter(x => x !== s) : [...form.subjects, s]);

  const changeStep = (n: number) => {
    setError(""); setVis(false);
    setTimeout(() => { setStep(n); setStepKey(k => k + 1); setVis(true); }, 70);
  };

  useEffect(() => {
    if (schoolQuery.length < 2) { setSchoolResults([]); return; }
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      try {
        const r = await fetch(`/api/schools?q=${encodeURIComponent(schoolQuery)}`);
        const d = await r.json();
        setSchoolResults(d.schools || []);
        setShowDrop(true);
      } catch { /* skip */ }
    }, 300);
  }, [schoolQuery]);

  const goNext = () => {
    setError("");
    if (step === 1) {
      if (!form.role)                 return setError("Vui lòng chọn vai trò");
      if (!form.name.trim())          return setError("Vui lòng nhập họ tên");
      if (!form.email.includes("@"))  return setError("Email không hợp lệ");
      if (form.password.length < 6)   return setError("Mật khẩu ít nhất 6 ký tự");
    }
    changeStep(step + 1);
  };

  const handleSubmit = async () => {
    setError("");
    if (form.role !== "ADMIN" && !form.schoolName.trim()) return setError("Vui lòng nhập tên trường");
    if (form.role !== "ADMIN" && !form.level)             return setError("Vui lòng chọn cấp học");
    if (form.role === "TEACHER") {
      if (form.subjects.length === 0) return setError("Vui lòng chọn ít nhất 1 môn giảng dạy");
      if (!form.activationCode.trim()) return setError("Vui lòng nhập mã kích hoạt do admin cung cấp");
    }
    if (form.role === "ADMIN" && !form.activationCode.trim()) {
      return setError("Vui lòng nhập mã khởi tạo admin");
    }
    if (form.role === "STUDENT" && !form.className.trim())
      return setError("Vui lòng nhập tên lớp (ví dụ: 10A1)");

    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: form.role,
          name: form.name,
          email: form.email,
          password: form.password,
          schoolId: form.role === "ADMIN" ? undefined : form.schoolId || undefined,
          schoolName: form.role === "ADMIN" ? undefined : form.schoolName,
          level: form.role === "ADMIN" ? undefined : form.level,
          subjects: form.role === "TEACHER" ? form.subjects : [],
          className: form.role === "STUDENT" ? form.className.trim().toUpperCase() : "",
          activationCode: ["TEACHER", "ADMIN"].includes(form.role)
            ? form.activationCode.trim().toUpperCase()
            : undefined,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Đăng ký thất bại");
      router.push("/auth/login?registered=1");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Có lỗi xảy ra");
    } finally {
      setLoading(false);
    }
  };

  const inp: React.CSSProperties = {
    width: "100%", padding: "10px 14px", borderRadius: 10,
    border: "1.5px solid #D1DFFE", background: "white",
    fontSize: 14, color: "#1a202c", outline: "none",
    transition: "border-color .18s", fontFamily: "inherit",
  };
  const stepLabels = isAdminRole
    ? ["Tài khoản"]
    : ["Tài khoản", form.role === "STUDENT" ? "Trường & lớp" : "Trường & môn"];

  return (
    <>
      <style>{`
        @keyframes fadeSlide { from { opacity:0; transform:translateY(10px) } to { opacity:1; transform:translateY(0) } }
        .ps-inp:focus { border-color:${B}!important; box-shadow:0 0 0 3px ${BL}; }
      `}</style>

      {/* Step indicator */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 28 }}>
        {stepLabels.map((label, i) => {
          const n = i + 1;
          const done = step > n; const active = step === n;
          return (
            <div key={n} style={{ display: "flex", alignItems: "center", gap: 6, flex: i < stepLabels.length - 1 ? 1 : "none" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                <div style={{
                  width: 24, height: 24, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 12, fontWeight: 700,
                  background: done || active ? B : "#e5e7eb",
                  color: done || active ? "white" : "#9ca3af",
                }}>
                  {done ? "✓" : n}
                </div>
                <span style={{ fontSize: 12, fontWeight: active ? 700 : 400, color: active ? B : "#9ca3af" }}>{label}</span>
              </div>
              {i < stepLabels.length - 1 && (
                <div style={{ flex: 1, height: 1, background: step > n ? B : "#e5e7eb", marginLeft: 4 }} />
              )}
            </div>
          );
        })}
      </div>

      <div key={stepKey} style={{ display: "flex", flexDirection: "column", gap: 18 }}>

        {/* STEP 1: Role + basic info */}
        {step === 1 && (<>
          <FadeField label="Bạn là" required visible={vis}>
            <div style={{ display: "grid", gridTemplateColumns: `repeat(${roleOptions.length}, minmax(0, 1fr))`, gap: 10 }}>
              {roleOptions.map(r => {
                const active = form.role === r;
                return (
                  <button key={r} type="button" onClick={() => set("role", r)} style={{
                    padding: "14px", borderRadius: 12, fontSize: 14, fontWeight: 700,
                    border: `2px solid ${active ? B : "#e5e7eb"}`,
                    background: active ? BL : "white",
                    color: active ? B : "#6b7280", cursor: "pointer", transition: "all .18s",
                    display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
                  }}>
                    {r === "TEACHER" ? "Giáo viên" : r === "STUDENT" ? "Học sinh" : "Quản trị"}
                  </button>
                );
              })}
            </div>
            {form.role === "STUDENT" && (
              <div style={{ marginTop: 10, padding: "10px 14px", borderRadius: 10, background: BL, border: `1px solid ${BB}`, fontSize: 12, color: "#1e40af" }}>
                Học sinh không cần mã kích hoạt — đăng ký xong là dùng được ngay. Thêm giáo viên sau bằng nút <strong>+Thêm GV</strong> trong trang chủ.
              </div>
            )}
            {form.role === "TEACHER" && (
              <div style={{ marginTop: 10, padding: "10px 14px", borderRadius: 10, background: BL, border: `1px solid ${BB}`, fontSize: 12, color: "#1e40af" }}>
                Giáo viên cần nhập <strong>mã kích hoạt</strong> do admin cung cấp để đăng ký. Hệ thống sẽ tự tạo mã giáo viên duy nhất sau khi đăng ký thành công.
              </div>
            )}
            {form.role === "ADMIN" && (
              <div style={{ marginTop: 10, padding: "10px 14px", borderRadius: 10, background: "#fff7ed", border: "1px solid #fdba74", fontSize: 12, color: "#9a3412" }}>
                Chế độ này chỉ dùng để <strong>khởi tạo admin đầu tiên</strong>. Bạn phải có mã bootstrap admin từ cấu hình hệ thống.
              </div>
            )}
          </FadeField>

          <FadeField label="Họ và tên" required delay={80} visible={vis}>
            <input className="ps-inp" style={inp} placeholder="Nguyễn Văn A"
              value={form.name} onChange={e => set("name", e.target.value)} autoFocus />
          </FadeField>

          <FadeField label="Email" required delay={130} visible={vis}>
            <input className="ps-inp" style={inp} type="email" placeholder="example@email.com"
              value={form.email} onChange={e => set("email", e.target.value)} />
          </FadeField>

          <FadeField label="Mật khẩu" required delay={180} visible={vis}
            hint="Ít nhất 6 ký tự">
            <input className="ps-inp" style={inp} type="password" placeholder="••••••••"
              value={form.password} onChange={e => set("password", e.target.value)} />
          </FadeField>

          {(["TEACHER", "ADMIN"] as const).includes(form.role as "TEACHER" | "ADMIN") && (
            <FadeField
              label={form.role === "ADMIN" ? "Mã khởi tạo admin" : "Mã kích hoạt"}
              required
              delay={230}
              visible={vis}
              hint={form.role === "ADMIN"
                ? "Mã bí mật cấu hình trên Vercel để tạo admin đầu tiên"
                : "Mã do admin cung cấp — liên hệ quản trị viên nếu chưa có"}
            >
              <input className="ps-inp"
                style={{ ...inp, fontFamily: "monospace", letterSpacing: "0.12em", fontWeight: 700, fontSize: 16 }}
                placeholder={form.role === "ADMIN" ? "VD: ADMIN-BOOTSTRAP-2026" : "VD: ACTIVE-2026-XXXX"}
                value={form.activationCode}
                onChange={e => set("activationCode", e.target.value.toUpperCase())} />
            </FadeField>
          )}
        </>)}

        {/* STEP 2: School + level + subjects / class */}
        {step === 2 && !isAdminRole && (<>
          <FadeField label="Trường học" required visible={vis}>
            <div style={{ position: "relative" }}>
              <input className="ps-inp" style={inp}
                placeholder="Tìm tên trường..."
                value={schoolQuery}
                onChange={e => { setSchoolQuery(e.target.value); set("schoolName", e.target.value); }}
                onFocus={() => schoolResults.length > 0 && setShowDrop(true)}
                onBlur={() => setTimeout(() => setShowDrop(false), 200)} />
              {showDrop && schoolResults.length > 0 && (
                <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "white", border: "1.5px solid #D1DFFE", borderRadius: 10, zIndex: 50, maxHeight: 200, overflowY: "auto", marginTop: 4 }}>
                  {schoolResults.map(s => (
                    <button key={s.id} type="button" style={{ width: "100%", textAlign: "left", padding: "10px 14px", fontSize: 13, background: "transparent", border: "none", cursor: "pointer" }}
                      onMouseDown={() => { set("schoolId", s.id); set("schoolName", s.name); setSchoolQuery(s.name); setShowDrop(false); }}
                      onMouseEnter={e => (e.currentTarget.style.background = BL)}
                      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                      <div style={{ fontWeight: 600, color: "#1a202c" }}>{s.name}</div>
                      {s.address && <div style={{ fontSize: 11, color: "#9ca3af" }}>{s.address}</div>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </FadeField>

          <FadeField label="Cấp học" required delay={80} visible={vis}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
              {LEVELS.map(lv => {
                const short = lv.split(" ")[0] + " " + lv.split(" ")[1]; const active = form.level === lv;
                return (
                  <button key={lv} type="button" onClick={() => set("level", lv)} style={{
                    padding: "10px 4px", borderRadius: 10, fontSize: 12, fontWeight: 600,
                    border: `2px solid ${active ? B : "#e5e7eb"}`,
                    background: active ? BL : "white",
                    color: active ? B : "#6b7280", cursor: "pointer", lineHeight: 1.3,
                  }}>{short}</button>
                );
              })}
            </div>
          </FadeField>

          {/* GIÁO VIÊN: chọn môn dạy */}
          {form.role === "TEACHER" && (
            <div style={{ animation: "fadeSlide .4s ease both" }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: B, marginBottom: 6 }}>
                Môn giảng dạy <span style={{ color: "#e53e3e" }}>*</span>
              </label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                {SUBJECTS.map(s => {
                  const active = form.subjects.includes(s);
                  return (
                    <button key={s} type="button" onClick={() => toggleSubject(s)} style={{
                      padding: "6px 12px", borderRadius: 8, fontSize: 12, fontWeight: 600,
                      border: `1.5px solid ${active ? B : "#e5e7eb"}`,
                      background: active ? BL : "white",
                      color: active ? B : "#6b7280", cursor: "pointer",
                    }}>{s}</button>
                  );
                })}
              </div>
              {form.subjects.length > 0 && (
                <p style={{ fontSize: 11.5, color: B, marginTop: 6 }}>
                  {form.subjects.join(", ")} — môn này sẽ tự điền vào đề thi khi tạo.
                </p>
              )}
            </div>
          )}

          {/* HỌC SINH: nhập tên lớp */}
          {form.role === "STUDENT" && (
            <FadeField label="Lớp học" required delay={130} visible={vis}
              hint="Ví dụ: 10A1, 11B2, 12C3 — giáo viên dùng tên lớp này để giao đề thi">
              <input className="ps-inp"
                style={{ ...inp, textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 700, fontSize: 18 }}
                placeholder="10A1"
                value={form.className}
                onChange={e => set("className", e.target.value.toUpperCase())} />
            </FadeField>
          )}

          {/* Confirm summary */}
          <div style={{ borderRadius: 12, padding: "14px 16px", background: BL, border: `1px solid ${BB}` }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: B, marginBottom: 10, letterSpacing: "0.06em" }}>
              XÁC NHẬN THÔNG TIN
            </div>
            {([
              ["Vai trò", form.role === "TEACHER" ? "Giáo viên" : form.role === "STUDENT" ? "Học sinh" : "Quản trị"],
              ["Họ tên", form.name],
              ["Email", form.email],
              ...(form.role === "TEACHER"
                ? [["Môn dạy", form.subjects.join(", ") || "—"]] as [string, string][]
                : [["Lớp học", form.className || "—"]] as [string, string][]),
            ] as [string, string][]).map(([k, v]) => (
              <div key={k} style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: 13, marginBottom: 6 }}>
                <span style={{ fontWeight: 600, color: B, flexShrink: 0 }}>{k}</span>
                <span style={{ color: "#374151", textAlign: "right" }}>{v}</span>
              </div>
            ))}
          </div>
        </>)}
      </div>

      {error && (
        <div style={{ marginTop: 16, padding: "11px 14px", borderRadius: 10, background: "#fff5f5", border: "1px solid #fed7d7", color: "#c53030", fontSize: 13 }}>
          {error}
        </div>
      )}

      <div style={{ display: "flex", gap: 10, marginTop: 22 }}>
        {step > 1 && (
          <button type="button" onClick={() => changeStep(step - 1)} style={{
            flex: 1, padding: "12px 0", borderRadius: 10, fontSize: 13, fontWeight: 600,
            border: "1.5px solid #d1d5db", background: "white", color: "#6b7280", cursor: "pointer",
          }}>
            ← Quay lại
          </button>
        )}
        {step < stepLabels.length ? (
          <button type="button" onClick={goNext} style={{
            flex: 2, padding: "12px 0", borderRadius: 10, fontSize: 14, fontWeight: 700,
            background: B, color: "white", border: "none", cursor: "pointer",
          }}>
            {isAdminRole ? "Tạo admin" : "Tiếp theo →"}
          </button>
        ) : (
          <button type="button" onClick={handleSubmit} disabled={loading} style={{
            flex: 2, padding: "12px 0", borderRadius: 10, fontSize: 14, fontWeight: 700,
            background: loading ? "#93c5fd" : B, color: "white", border: "none",
            cursor: loading ? "not-allowed" : "pointer",
          }}>
            {loading ? "Đang tạo tài khoản..." : "Tạo tài khoản"}
          </button>
        )}
      </div>

      <p style={{ textAlign: "center", marginTop: 20, fontSize: 13, color: "#9ca3af" }}>
        Đã có tài khoản?{" "}
        <a href="/auth/login" style={{ fontWeight: 700, color: B, textDecoration: "none" }}>Đăng nhập</a>
      </p>
    </>
  );
}