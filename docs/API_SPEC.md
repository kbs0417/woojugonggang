# API 초안

기본 주소: `/api`

| Method | Path | 설명 |
|---|---|---|
| GET | `/health` | 서버 상태 확인 |
| POST | `/auth/login` | 협업자 로그인(데모 계정 자동 생성) |
| GET | `/users/me` | 내 프로필 조회 |
| PATCH | `/users/me` | 내 프로필 수정 |
| GET | `/courses` | 내 수업 목록 |
| PUT | `/courses` | 내 시간표 전체 저장 |
| GET | `/posts` | 모집글 목록 |
| POST | `/posts` | 모집글 작성 |
| POST | `/posts/{id}/participants` | 모집 참여 |
| DELETE | `/posts/{id}/participants/me` | 참여 취소 |
| GET | `/chat-rooms` | 내 채팅방 목록 |
| GET | `/chat-rooms/{id}/messages` | 이전 메시지 조회 |
| POST | `/chat-rooms/{id}/messages` | 메시지 전송 |

로그인을 제외한 API는 `X-User-Name` 헤더에 로그인 응답의 `username`을 보낸다. 현재 채팅 화면은 3초마다 REST API를 조회하며, WebSocket은 후속 개선 범위다.

## 운영 환경변수

- `DB_URL`: MySQL JDBC URL (미지정 시 로컬 H2 파일 DB)
- `DB_USERNAME`, `DB_PASSWORD`: DB 계정
- `APP_DEMO_PASSWORD`: 공용 데모 비밀번호
- `ALLOWED_ORIGINS`: 쉼표로 구분한 프론트엔드 주소

