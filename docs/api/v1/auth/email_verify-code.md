# POST /api/v1/auth/email/verify-code

## 1. 개요

- **기능**: 이메일로 전송된 인증번호를 확인하여 이메일 인증을 완료합니다.
- **엔드포인트**: `POST /api/v1/auth/email/verify-code`

---

## 2. 요청

### Body Parameters

| 필드명 | 타입 | 필수 | 설명 |
|---|---|---:|---|
| `email` | `String` | ✅ | 사용자 이메일 |
| `code` | `String` | ✅ | 이메일로 받은 인증번호 |
| `type` | `String` | ❌ | 인증 목적. 현재는 `"register"`만 지원 (기본값: `"register"`) |

### 요청 예시 (JSON)

```json
{
  "email": "example@email.com",
  "code": "123456",
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
    "message": "이메일 인증이 완료되었습니다."
  }
}
```

---

## 4. 실패

| 상태 코드 | 에러 코드 | 설명 |
|---:|---|---|
| 400 | `INVALID_INPUT` | 필수값 누락 또는 지원하지 않는 `type` |
| 400 | `INVALID_FORMAT` | 이메일 형식 오류 |
| 400 | `INVALID_CODE` | 인증번호 불일치 |
| 400 | `CODE_EXPIRED` | 인증번호 만료 |
| 500 | `SERVER_ERROR` | 서버 내부 오류 |

### 실패 예시

```json
{
  "status": "error",
  "code": "INVALID_CODE",
  "message": "인증번호가 올바르지 않습니다."
}
```

---

## 5. 서버 구현 참고(현재 정책)

- 서버는 `VerificationToken`에 저장된 인증번호 **SHA-256 해시**와 입력값을 비교합니다.
- 인증 성공 시:
  - `User.isVerified = true`로 갱신(해당 이메일의 유저가 존재하는 경우)
  - 사용된 인증 토큰은 1회성으로 삭제됩니다.

