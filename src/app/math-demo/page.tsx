"use client";

import SafeMathRenderer from "@/components/latex/SafeMathRenderer";

export default function MathDemoPage() {
  const demoContent = [
    {
      title: "Cơ bản",
      examples: [
        "Hàm số $f(x) = x^2$ liên tục trên $\\mathbb{R}$",
        "Phương trình $ax^2 + bx + c = 0$ có nghiệm $x = \\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}$",
        "$$\\sum_{i=1}^{n} i = \\frac{n(n+1)}{2}$$",
      ],
    },
    {
      title: "Hình học",
      examples: [
        "Vectơ $\\overrightarrow{AB}$ có độ dài $|\\overrightarrow{AB}| = 5$",
        "Cung $\\stackrel{\\frown}{AB}$ có số đo $60^\\circ$",
        "$$\\triangle ABC \\sim \\triangle DEF$$",
        "Đường tròn tâm $O$, bán kính $R$: $x^2 + y^2 = R^2$",
      ],
    },
    {
      title: "Giải tích",
      examples: [
        "Đạo hàm: $f'(x) = \\lim_{h \\to 0} \\frac{f(x+h) - f(x)}{h}$",
        "$$\\int_{a}^{b} f(x) dx = F(b) - F(a)$$",
        "Giới hạn: $\\lim_{x \\to \\infty} \\frac{1}{x} = 0$",
      ],
    },
    {
      title: "Xác suất",
      examples: [
        "$$P(A) = \\frac{|A|}{|\\Omega|}$$",
        "Kỳ vọng: $E(X) = \\sum_{i} x_i \\cdot p_i$",
        "$$\\binom{n}{k} = \\frac{n!}{k!(n-k)!}$$",
      ],
    },
    {
      title: "Toán rời rạc",
      examples: [
        "$$\\forall x \\in \\mathbb{R}, x^2 \\geq 0$$",
        "$$A \\cup (B \\cap C) = (A \\cup B) \\cap (A \\cup C)$$",
        "Số nguyên tố: $p \\in \\mathbb{P}$",
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-center mb-8">
          📐 Demo Hiển thị Công thức Toán học
        </h1>
        
        <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <h2 className="text-lg font-semibold text-blue-800 mb-2">
            ℹ️ Về SafeMathRenderer
          </h2>
          <p className="text-blue-700 text-sm">
            Component này giải quyết vấn đề công thức toán không hiển thị trên Vercel 
            bằng cách render công thức dưới dạng ảnh sử dụng dịch vụ CodeCogs.
          </p>
          <ul className="mt-2 text-blue-700 text-sm list-disc list-inside">
            <li>Hỗ trợ inline math: <code>$...$</code> hoặc <code>\(...\)</code></li>
            <li>Hỗ trợ block math: <code>$$...$$</code> hoặc <code>\[...\]</code></li>
            <li>Tự động chuyển đổi Unicode Greek và toán tử</li>
            <li>Hỗ trợ ký hiệu toán học Việt Nam: arc(), vec(), ovl()</li>
          </ul>
        </div>

        <div className="space-y-6">
          {demoContent.map((section, sectionIdx) => (
            <div key={sectionIdx} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
                <h2 className="text-xl font-bold text-gray-900">{section.title}</h2>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  {section.examples.map((example, exampleIdx) => (
                    <div
                      key={exampleIdx}
                      className="p-4 bg-white rounded-lg border border-gray-200 shadow-sm"
                    >
                      <div className="text-sm text-gray-500 mb-2 font-mono">
                        {example}
                      </div>
                      <div className="text-lg leading-relaxed">
                        <SafeMathRenderer content={example} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
            <h2 className="text-xl font-bold text-gray-900">🧪 Test Công thức</h2>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                <h3 className="font-semibold text-yellow-800 mb-2">Câu hỏi mẫu từ đề kiểm tra:</h3>
                <p className="text-yellow-700">
                  Hàm số $f(x) = x^3 - 3x^2 + 2$ có bảng biến thiên như hình dưới:
                </p>
                <p className="text-yellow-700 mt-2">
                  Số điểm cực trị của hàm số $f(x)$ là:
                </p>
                <div className="mt-4 p-3 bg-white rounded border">
                  <p className="font-medium">A. 0</p>
                  <p className="font-medium">B. 1</p>
                  <p className="font-medium">C. 2</p>
                  <p className="font-medium">D. 3</p>
                </div>
              </div>

              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <h3 className="font-semibold text-green-800 mb-2">Đáp án đúng: C</h3>
                <p className="text-green-700">
                  Vì $f'(x) = 3x^2 - 6x = 3x(x-2)$, nên $f'(x) = 0$ khi $x = 0$ hoặc $x = 2$.
                </p>
                <p className="text-green-700 mt-1">
                  Hàm số có 2 điểm cực trị.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 text-center text-gray-500 text-sm">
          <p>
            💡 Tip: Kiểm tra trên Vercel deployment để xác nhận công thức hiển thị đúng.
          </p>
        </div>
      </div>
    </div>
  );
}