# GCS

Next.js 14 기반 풀스택 웹 애플리케이션

## 기술 스택

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Database**: PostgreSQL + Prisma
- **Authentication**: NextAuth.js
- **Styling**: Tailwind CSS
- **State Management**: Zustand + TanStack Query
- **Form**: React Hook Form + Zod
- **Email**: Brevo (Transactional Email)
- **Deployment**: Railway / Vercel

## 프로젝트 구조

```
├── app/                    # Next.js App Router
│   ├── (auth)/            # 인증 관련 페이지 (로그인, 회원가입)
│   ├── (main)/            # 메인 페이지 (헤더/푸터 포함)
│   └── api/               # API Routes (백엔드)
├── components/
│   ├── layout/            # 레이아웃 컴포넌트
│   └── ui/                # 재사용 UI 컴포넌트
├── lib/                   # 라이브러리 설정 및 유틸리티
│   ├── auth.ts            # NextAuth 설정
│   ├── db.ts              # Prisma 클라이언트
│   ├── email.ts           # Brevo 이메일
│   ├── utils.ts           # 유틸리티 함수
│   └── validations/       # Zod 스키마
├── stores/                # Zustand 스토어
├── hooks/                 # 커스텀 React 훅
├── types/                 # TypeScript 타입 정의
└── prisma/                # Prisma 스키마
```

## 시작하기

### 1. 의존성 설치

```bash
npm install
```

### 2. 환경 변수 설정

```bash
cp env.sample .env
```

`.env` 파일을 열어 아래 값들을 설정:

- `DATABASE_URL`: PostgreSQL 연결 문자열
- `NEXTAUTH_SECRET`: NextAuth 시크릿 키 (생성: `openssl rand -base64 32`)
- `BREVO_API_KEY`: Brevo API 키
- `BREVO_FROM_EMAIL`: 발신자 이메일(예: `noreply@yourdomain.com`)

PowerShell 사용 시:

```powershell
Copy-Item env.sample .env
```

### 3. 데이터베이스 설정

```bash
# Prisma Client 생성
npm run db:generate

# 데이터베이스에 스키마 적용
npm run db:push
```

### 4. 개발 서버 실행

```bash
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000) 접속

## 주요 명령어

| 명령어 | 설명 |
|--------|------|
| `npm run dev` | 개발 서버 실행 |
| `npm run build` | 프로덕션 빌드 |
| `npm run start` | 프로덕션 서버 실행 |
| `npm run lint` | ESLint 실행 |
| `npm run db:generate` | Prisma Client 생성 |
| `npm run db:push` | 스키마 DB 적용 (개발용) |
| `npm run db:migrate` | 마이그레이션 생성/적용 |
| `npm run db:studio` | Prisma Studio 실행 |

## 라이선스

MIT
