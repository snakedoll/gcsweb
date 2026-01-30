# POST /api/v1/auth/email/send-verification

## 1. 개요

- **기능**: 회원가입 이메일 인증을 위한 인증번호를 이메일로 전송합니다.
- **엔드포인트**: `POST /api/v1/auth/email/send-verification`

---

## 2. 요청

### Body Parameters

| 필드명 | 타입 | 필수 | 설명 |
|---|---|---:|---|
| `email` | `String` | ✅ | 사용자 이메일 |
| `type` | `String` | ❌ | 인증 목적. 현재는 `"register"`만 지원 (기본값: `"register"`) |

### 요청 예시 (JSON)

```json
{
  "email": "example@email.com",
  "type": "register"
}
```

---

## 3. 응답

### 성공 (200 OK)

```json
{
  "status": "success",
  "data": {
    "message": "인증 메일이 전송되었습니다."
  }
}
```

---

## 4. 실패

| 상태 코드 | 에러 코드 | 설명 |
|---:|---|---|
| 400 | `INVALID_INPUT` | 필수값 누락 또는 지원하지 않는 `type` |
| 400 | `INVALID_FORMAT` | 이메일 형식 오류 |
| 429 | `TOO_MANY_REQUESTS` | 재전송 제한(기본 60초 쿨다운) |
| 500 | `EMAIL_SEND_FAILED` | 이메일 전송 실패 |
| 500 | `SERVER_ERROR` | 서버 내부 오류 |

### 실패 예시

```json
{
  "status": "error",
  "code": "INVALID_FORMAT",
  "message": "올바른 이메일 형식이 아닙니다."
}
```

---

## 5. 서버 구현 참고(현재 정책)

- 인증번호는 **6자리 숫자 문자열**로 생성됩니다.
- 유효기간은 **10분**입니다.
- 서버는 DB(`VerificationToken`)에 인증번호를 **SHA-256 해시**로 저장합니다.
- 동일 이메일/목적(identifier) 기준으로 **최근 60초 내 재전송을 제한**합니다.

