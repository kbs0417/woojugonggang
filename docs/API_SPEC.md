# API 초안

기본 주소: `/api`

| Method | Path | 설명 |
|---|---|---|
| GET | `/health` | 서버 상태 확인 |
| POST | `/auth/register` | 회원가입 |
| POST | `/auth/login` | 로그인 |
| GET | `/users/me` | 내 프로필 조회 |
| PATCH | `/users/me` | 내 프로필 수정 |
| GET | `/courses` | 내 수업 목록 |
| PUT | `/courses` | 내 시간표 전체 저장 |
| GET | `/posts` | 모집글 목록 |
| POST | `/posts` | 모집글 작성 |
| PUT | `/posts/{id}` | 내가 작성한 모집글 수정 |
| DELETE | `/posts/{id}` | 내가 작성한 모집글 삭제 |
| POST | `/posts/{id}/participants` | 모집 참여 |
| DELETE | `/posts/{id}/participants/me` | 참여 취소 |
| GET | `/chat-rooms` | 내 채팅방 목록 |
| GET | `/chat-rooms/{id}/messages` | 이전 메시지 조회 |
| POST | `/chat-rooms/{id}/messages` | 메시지 전송 |
| GET | `/notifications` | 관심사 맞춤 알림 목록 |
| PATCH | `/notifications/{id}/read` | 알림 읽음 처리 |

로그인을 제외한 API는 `X-User-Name` 헤더에 로그인 응답의 `username`을 보낸다. 현재 채팅 화면은 3초마다 REST API를 조회하며, WebSocket은 후속 개선 범위다.

회원가입과 프로필 수정에서는 `interests`(학습·운동·동아리·취미)와 `interestTags` 배열을 저장한다. 새 모집글의 카테고리 또는 태그가 일치하면 해당 회원의 사이트 내부 알림이 생성된다.

## 운영 환경변수

- `DB_URL`: MySQL JDBC URL (미지정 시 로컬 H2 파일 DB)
- `DB_USERNAME`, `DB_PASSWORD`: DB 계정
- `APP_DEMO_PASSWORD`: 공용 데모 비밀번호
- `ALLOWED_ORIGINS`: 쉼표로 구분한 프론트엔드 주소

