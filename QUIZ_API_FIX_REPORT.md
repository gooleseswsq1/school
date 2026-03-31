# Quiz API Error Analysis & Fixes

## Summary
Fixed all Quiz API validation and error handling issues. The errors were caused by missing foreign key validation, inadequate input validation, and incomplete error handling for Prisma constraint violations.

## Errors Found

### 1. **POST /api/quiz - 500 Error (Foreign Key Constraint)**
- **Error Code**: P2003 - Foreign key constraint failed
- **Root Cause**: `blockId` didn't exist in `PageBlock` table
- **Status Code**: 500 (was throwing 500, should be 404)
- **Fix**: Added `pageBlock.findUnique()` check before creating quiz

### 2. **POST /api/quiz - 404 Errors (After Initial Fix)**
- **Root Cause**: New validation rejecting valid blockIds that don't exist
- **Status Code**: 404
- **Fix**: Proper error message handling

### 3. **POST /api/quiz/questions - Missing Quiz Validation**
- **Issue**: Could create questions with non-existent `quizId`
- **Root Cause**: No validation to check if quiz exists
- **Status Code**: Would fail with 500 (foreign key error)
- **Fix**: Added `quiz.findUnique()` check before creating question

### 4. **PUT /api/quiz/questions - No Existence Check**
- **Issue**: Updating non-existent question returns 500
- **Root Cause**: Missing pre-update validation
- **Status Code**: 500 (should be 404)
- **Fix**: Added `question.findUnique()` check before update

### 5. **DELETE /api/quiz/questions - Inadequate Error Handling**
- **Issue**: Insufficient error context for failures
- **Root Cause**: Generic error handling
- **Status Code**: 500
- **Fix**: Added Prisma error detection (P2025) and proper 404 responses

### 6. **Weak Schema Validation**
- **Issue**: Empty strings, missing fields accepted
- **Root Cause**: No `.min()` constraints in Zod schemas
- **Fix**: Added validation for minimum length and required fields

## Changes Made

### 1. [src/app/api/quiz/route.ts](src/app/api/quiz/route.ts)
```typescript
// ✅ Enhanced schemas with validation
const createQuizSchema = z.object({
  blockId: z.string().min(1, "Block ID cannot be empty"),
  title: z.string().min(1, "Title cannot be empty").optional(),
});

const bulkImportSchema = z.object({
  blockId: z.string().min(1, "Block ID cannot be empty"),
  questions: z.array(
    z.object({
      questionText: z.string().min(1, "Question text cannot be empty"),
      options: z.array(
        z.object({
          optionText: z.string().min(1, "Option text cannot be empty"),
          isCorrect: z.boolean(),
        })
      ).min(2, "Each question must have at least 2 options"),
    })
  ).min(1, "At least one question is required"),
});

// ✅ Improved error handling
export async function POST(request: NextRequest) {
  try {
    // ... existing validation code ...
    
    // Verify that the block exists
    const block = await prisma.pageBlock.findUnique({
      where: { id: blockId },
    });

    if (!block) {
      return NextResponse.json(
        { error: "PageBlock not found" },
        { status: 404 }
      );
    }
    
    // ... rest of implementation ...
  } catch (error) {
    // Detect P2003 (foreign key) errors
    if (errorMessage.includes("P2003")) {
      return NextResponse.json(
        { error: "Invalid block ID - PageBlock not found" },
        { status: 404 }
      );
    }
  }
}
```

### 2. [src/app/api/quiz/questions/route.ts](src/app/api/quiz/questions/route.ts)
```typescript
// ✅ Enhanced schema with validation
const createQuestionSchema = z.object({
  quizId: z.string().min(1, "Quiz ID cannot be empty"),
  questionText: z.string().min(1, "Question text cannot be empty"),
  questionType: z.string().default("multiple"),
  order: z.number().default(0),
  options: z.array(z.object({
    optionText: z.string().min(1, "Option text cannot be empty"),
    isCorrect: z.boolean(),
  })).default([]),
});

// ✅ POST: Added quiz existence check
export async function POST(request: NextRequest) {
  const quiz = await prisma.quiz.findUnique({
    where: { id: data.quizId },
  });

  if (!quiz) {
    return NextResponse.json(
      { error: "Quiz not found" },
      { status: 404 }
    );
  }
}

// ✅ PUT: Added question existence check
export async function PUT(request: NextRequest) {
  const existingQuestion = await prisma.question.findUnique({
    where: { id: questionId },
  });

  if (!existingQuestion) {
    return NextResponse.json(
      { error: "Question not found" },
      { status: 404 }
    );
  }
}

// ✅ DELETE: Added question existence check & error handling
export async function DELETE(request: NextRequest) {
  const existingQuestion = await prisma.question.findUnique({
    where: { id: questionId },
  });

  if (!existingQuestion) {
    return NextResponse.json(
      { error: "Question not found" },
      { status: 404 }
    );
  }
  
  // Improved catch block with Prisma error detection
  if (errorMessage.includes("P2025")) {
    return NextResponse.json(
      { error: "Question not found" },
      { status: 404 }
    );
  }
}
```

## API Response Status Codes

### Correct Status Codes Now
- **201 Created**: Successfully created resource
- **200 OK**: Successfully fetched/updated resource
- **400 Bad Request**: Invalid schema or missing required fields
- **404 Not Found**: Referenced resource doesn't exist
- **500 Internal Server Error**: Unexpected database/server errors

### Example Error Responses

#### Before (Incorrect)
```json
{
  "error": "Foreign key constraint violated on the foreign key"
}
// Status: 500
```

#### After (Correct)
```json
{
  "error": "PageBlock not found"
}
// Status: 404
```

## Testing Recommendations

### Test Case 1: Create Quiz with Invalid Block
```bash
POST /api/quiz
{
  "blockId": "invalid-id",
  "title": "Test Quiz"
}
# Should return 404 with "PageBlock not found"
```

### Test Case 2: Create Question with Invalid Quiz
```bash
POST /api/quiz/questions
{
  "quizId": "invalid-id",
  "questionText": "What is 2+2?",
  "options": [
    { "optionText": "4", "isCorrect": true },
    { "optionText": "5", "isCorrect": false }
  ]
}
# Should return 404 with "Quiz not found"
```

### Test Case 3: Empty/Invalid Fields
```bash
POST /api/quiz
{
  "blockId": "",
  "title": ""
}
# Should return 400 with Zod validation errors
```

### Test Case 4: Update Non-existent Question
```bash
PUT /api/quiz/questions?id=invalid-id
{
  "questionText": "New text"
}
# Should return 404 with "Question not found"
```

### Test Case 5: Delete Non-existent Question
```bash
DELETE /api/quiz/questions?id=invalid-id
# Should return 404 with "Question not found"
```

## Prisma Error Codes Reference
- **P2003**: Foreign key constraint violation
- **P2025**: Record not found (update/delete on non-existent record)
- **P2014**: Required relation violation
- **P2002**: Unique constraint violation

## Summary of Improvements
✅ All endpoints now validate foreign key references before database operations  
✅ Proper HTTP status codes (404 for not found, 400 for bad input)  
✅ Enhanced Zod schemas with minimum length and validation  
✅ Better error messages for debugging  
✅ Consistent error handling across all endpoints  
✅ Detection of Prisma-specific error codes  
