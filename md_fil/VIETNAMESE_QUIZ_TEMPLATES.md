# 🇻🇳 Mẫu Quiz Tiếng Việt - Sẵn Sàng Sử Dụng

Dưới đây là các mẫu quiz tiếng Việt mà bạn có thể sao chép và nhúng ngay vào các trang bài giảng.

---

## 1️⃣ Quiz: Hành tinh gần Mặt trời nhất

**Cách sử dụng:**
1. Vào trang bài giảng → Nhấp **"Thêm Nhúng"** → Dán mã bên dưới → Nhấp **"Thêm"**

```html
<iframe 
  srcdoc='
    <html>
      <head>
        <style>
          body {
            font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
            padding: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            margin: 0;
          }
          .quiz-container {
            max-width: 500px;
            margin: auto;
            background: white;
            padding: 30px;
            border-radius: 12px;
            box-shadow: 0 8px 32px rgba(0,0,0,0.2);
          }
          h3 {
            color: #333;
            margin-bottom: 5px;
            font-size: 20px;
          }
          .subtitle {
            color: #999;
            font-size: 14px;
            margin-bottom: 20px;
          }
          hr {
            border: none;
            border-top: 2px solid #eee;
            margin: 20px 0;
          }
          button {
            display: block;
            width: 100%;
            margin: 12px 0;
            padding: 14px;
            border: 2px solid #ddd;
            border-radius: 6px;
            background: white;
            cursor: pointer;
            font-size: 15px;
            font-weight: 500;
            transition: all 0.3s ease;
          }
          button:hover {
            background: #f5f5f5;
            border-color: #999;
          }
          button.correct {
            background: #4caf50;
            color: white;
            border-color: #4caf50;
          }
          button.incorrect {
            background: #f44336;
            color: white;
            border-color: #f44336;
          }
          .result {
            margin-top: 15px;
            padding: 12px;
            border-radius: 6px;
            text-align: center;
            font-weight: bold;
            display: none;
          }
          .result.show {
            display: block;
          }
          .result.success {
            background: #c8e6c9;
            color: #2e7d32;
          }
          .result.error {
            background: #ffcdd2;
            color: #c62828;
          }
        </style>
      </head>
      <body>
        <div class="quiz-container">
          <h3>❓ Câu hỏi: Hành tinh nào gần Mặt trời nhất?</h3>
          <p class="subtitle">Question: Which planet is closest to the Sun?</p>
          <hr>
          <button onclick="handleAnswer(false, this)">Kim tinh (Venus)</button>
          <button onclick="handleAnswer(true, this)">✓ Thủy tinh (Mercury)</button>
          <button onclick="handleAnswer(false, this)">Hỏa tinh (Mars)</button>
          <div class="result"></div>
        </div>
        <script>
          function handleAnswer(isCorrect, button) {
            const resultDiv = document.querySelector(".result");
            const buttons = document.querySelectorAll("button");
            
            buttons.forEach(btn => btn.disabled = true);
            button.classList.add(isCorrect ? "correct" : "incorrect");
            
            if (isCorrect) {
              resultDiv.innerHTML = "✓ Chính xác! Thủy tinh (Mercury) là hành tinh gần Mặt trời nhất.";
              resultDiv.className = "result show success";
            } else {
              resultDiv.innerHTML = "✗ Sai rồi! Hãy thử lại hoặc xem câu trả lời bên trên.";
              resultDiv.className = "result show error";
            }
          }
        </script>
      </body>
    </html>'
  width="100%" 
  height="400" 
  style="border: none; border-radius: 8px;">
</iframe>
```

---

## 2️⃣ Quiz 4 Lựa Chọn: Toán Học

```html
<iframe 
  srcdoc='
    <html>
      <head>
        <style>
          body {
            font-family: "Segoe UI", sans-serif;
            padding: 20px;
            background: #f0f2f5;
            margin: 0;
          }
          .quiz-container {
            max-width: 500px;
            margin: auto;
            background: white;
            padding: 25px;
            border-radius: 10px;
          }
          h3 {
            color: #1f3a93;
            margin-bottom: 15px;
          }
          .question-text {
            color: #555;
            margin-bottom: 20px;
            line-height: 1.6;
          }
          .options {
            display: grid;
            gap: 10px;
          }
          .option {
            padding: 12px;
            border: 2px solid #ddd;
            border-radius: 6px;
            cursor: pointer;
            transition: all 0.2s;
            background: white;
          }
          .option:hover {
            background: #f9f9f9;
            border-color: #1f3a93;
          }
          .option.selected {
            background: #1f3a93;
            color: white;
            border-color: #1f3a93;
          }
          .option.correct {
            background: #4caf50;
            color: white;
            border-color: #4caf50;
          }
          .option.incorrect {
            background: #f44336;
            color: white;
            border-color: #f44336;
          }
          .feedback {
            margin-top: 15px;
            padding: 12px;
            border-radius: 6px;
            display: none;
          }
          .feedback.show {
            display: block;
          }
        </style>
      </head>
      <body>
        <div class="quiz-container">
          <h3>📐 Câu hỏi Toán: 15 + 27 = ?</h3>
          <p class="question-text">Tìm kết quả phép cộng sau:</p>
          <div class="options">
            <div class="option" onclick="checkAnswer(false, this)">A) 40</div>
            <div class="option" onclick="checkAnswer(false, this)">B) 41</div>
            <div class="option" onclick="checkAnswer(true, this)">C) 42</div>
            <div class="option" onclick="checkAnswer(false, this)">D) 43</div>
          </div>
          <div class="feedback"></div>
        </div>
        <script>
          function checkAnswer(isCorrect, element) {
            const feedback = document.querySelector(".feedback");
            const options = document.querySelectorAll(".option");
            options.forEach(opt => opt.onclick = null);
            
            element.classList.add(isCorrect ? "correct" : "incorrect");
            feedback.innerHTML = isCorrect ? "✓ Chính xác!" : "✗ Sai rồi! Đáp án đúng là C) 42";
            feedback.className = "feedback show";
          }
        </script>
      </body>
    </html>'
  width="100%" 
  height="350" 
  style="border: none;">
</iframe>
```

---

## 3️⃣ Quiz Điền Khuyết

```html
<iframe 
  srcdoc='
    <html>
      <head>
        <style>
          body {
            font-family: "Segoe UI", sans-serif;
            padding: 20px;
            background: #fffbea;
            margin: 0;
          }
          .quiz-container {
            max-width: 600px;
            margin: auto;
            background: white;
            padding: 25px;
            border-radius: 10px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
          }
          h3 {
            color: #d97706;
            margin-bottom: 20px;
          }
          .sentence {
            font-size: 16px;
            line-height: 1.8;
            margin-bottom: 20px;
            color: #333;
          }
          .blank {
            display: inline-block;
            border-bottom: 2px dotted #d97706;
            min-width: 100px;
            padding: 0 8px;
          }
          input[type="text"] {
            padding: 8px 12px;
            border: 1px solid #ddd;
            border-radius: 4px;
            font-size: 14px;
            width: 150px;
          }
          button {
            padding: 10px 20px;
            background: #d97706;
            color: white;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
            margin-top: 15px;
          }
          button:hover {
            background: #b45309;
          }
          .feedback {
            margin-top: 15px;
            padding: 12px;
            border-radius: 6px;
            display: none;
          }
          .feedback.show {
            display: block;
          }
        </style>
      </head>
      <body>
        <div class="quiz-container">
          <h3>✏️ Điền vào chỗ trống:</h3>
          <div class="sentence">
            "Tính năng của cây xanh là __________ không khí và __________ đất."
          </div>
          <div>
            <label>Từ 1: <input type="text" id="answer1" placeholder="Nhập từ..."></label>
          </div>
          <div style="margin-top: 10px;">
            <label>Từ 2: <input type="text" id="answer2" placeholder="Nhập từ..."></label>
          </div>
          <button onclick="checkAnswers()">Kiểm Tra</button>
          <div class="feedback"></div>
        </div>
        <script>
          function checkAnswers() {
            const answer1 = document.getElementById("answer1").value.toLowerCase().trim();
            const answer2 = document.getElementById("answer2").value.toLowerCase().trim();
            const feedback = document.querySelector(".feedback");
            
            const correct1 = answer1 === "sạch" || answer1 === "lọc";
            const correct2 = answer2 === "bảo vệ" || answer2 === "giữ";
            
            if (correct1 && correct2) {
              feedback.innerHTML = "✓ Chính xác! Cây xanh sạch không khí và bảo vệ đất.";
              feedback.className = "feedback show success";
              feedback.style.background = "#c8e6c9";
              feedback.style.color = "#2e7d32";
            } else {
              feedback.innerHTML = "✗ Chưa đúng hết. Hãy thử lại!";
              feedback.className = "feedback show error";
              feedback.style.background = "#ffcdd2";
              feedback.style.color = "#c62828";
            }
          }
        </script>
      </body>
    </html>'
  width="100%" 
  height="400" 
  style="border: none;">
</iframe>
```

---

## 4️⃣ Quiz Đúng/Sai

```html
<iframe 
  srcdoc='
    <html>
      <head>
        <style>
          body {
            font-family: "Segoe UI", sans-serif;
            padding: 20px;
            background: #e3f2fd;
            margin: 0;
          }
          .quiz-container {
            max-width: 500px;
            margin: auto;
            background: white;
            padding: 25px;
            border-radius: 10px;
          }
          .question {
            margin-bottom: 20px;
          }
          .question h4 {
            color: #1565c0;
            margin-bottom: 15px;
          }
          .question p {
            color: #555;
            font-size: 16px;
            margin-bottom: 15px;
          }
          .buttons {
            display: flex;
            gap: 10px;
          }
          .btn {
            flex: 1;
            padding: 12px;
            border: 2px solid #ddd;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
            font-weight: bold;
            transition: all 0.2s;
          }
          .btn-true {
            color: #2e7d32;
            border-color: #4caf50;
          }
          .btn-false {
            color: #c62828;
            border-color: #f44336;
          }
          .btn:hover {
            background: #f5f5f5;
          }
          .feedback {
            margin-top: 15px;
            padding: 12px;
            border-radius: 6px;
            display: none;
          }
          .feedback.show {
            display: block;
          }
        </style>
      </head>
      <body>
        <div class="quiz-container">
          <div class="question">
            <h4>❓ Câu 1: Việt Nam nằm ở Đông Nam Á</h4>
            <p>"Việt Nam nằm ở khu vực Đông Nam Á" - Phát biểu này đúng hay sai?</p>
            <div class="buttons">
              <button class="btn btn-true" onclick="check(true, this)">✓ Đúng</button>
              <button class="btn btn-false" onclick="check(false, this)">✗ Sai</button>
            </div>
            <div class="feedback"></div>
          </div>
        </div>
        <script>
          function check(answer, btn) {
            const feedback = btn.parentElement.nextElementSibling;
            if (answer) {
              feedback.innerHTML = "✓ Chính xác!";
              feedback.style.background = "#c8e6c9";
              feedback.style.color = "#2e7d32";
            } else {
              feedback.innerHTML = "✗ Sai rồi! Đó là phát biểu đúng.";
              feedback.style.background = "#ffcdd2";
              feedback.style.color = "#c62828";
            }
            feedback.className = "feedback show";
            btn.parentElement.style.pointerEvents = "none";
          }
        </script>
      </body>
    </html>'
  width="100%" 
  height="350" 
  style="border: none;">
</iframe>
```

---

## 📋 Cách Tùy Chỉnh

Bạn có thể chỉnh sửa:

1. **Nội dung**: Thay đổi câu hỏi, đáp án
2. **Màu sắc**: Tìm mã màu như `#1f3a93` và thay đổi
3. **Cao độ**: Thay `height="400"` thành giá trị khác (px)
4. **Phông chữ**: Thay `"Segoe UI"` bằng phông khác

---

## 🔧 Ví dụ Tùy Chỉnh Nhanh

### Thay đổi màu chủ đề

Tìm dòng này:
```css
background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
```

Thay bằng một trong những cái này:
- **Xanh dương**: `#0066cc`
- **Tím**: `#b24bac`
- **Đỏ**: `#d32f2f`
- **Xanh lá**: `#388e3c`

---

## 💡 Mẹo

✅ **Tốt:**
- Dùng câu hỏi ngắn, rõ ràng
- Đặt chiều cao đủ để hiển thị toàn bộ nội dung
- Kiểm tra trên điện thoại

❌ **Tránh:**
- Câu hỏi quá dài
- Quá nhiều lựa chọn
- Sử dụng hình ảnh nặng ngoài srcdoc

---

## 📞 Cần Thêm?

Nếu bạn muốn thêm:
- ✏️ **Quiz tùy chỉnh**: Hãy viết nội dung, tôi sẽ tạo mã
- 🎨 **Thiết kế khác**: Mô tả giao diện mong muốn
- 🔄 **Chức năng**: Chia sẻ ý tưởng của bạn
