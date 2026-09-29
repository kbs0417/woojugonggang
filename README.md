# 우주공강

대학생의 시간표와 공강 시간을 기반으로 활동 모집과 단체 채팅을 연결하는 반응형 웹 애플리케이션입니다.

## 공개 데모

- https://woojugonggang.vercel.app
- 테스트 계정: `admin` / `admin`

## 첫 번째 목표(MVP)

1. 회원가입, 로그인, 프로필 관리
2. 시간표 등록 및 공강 시간 계산
3. 공강 활동 모집글 생성과 조회
4. 활동 참여 및 모집 인원 관리
5. 모집글별 단체 채팅

팀원 모집, 빈 강의실 대여, 택시 동승 모집은 MVP가 완료된 후 검토합니다.

## 기술 구성

- Frontend: HTML, CSS, JavaScript
- Server: Java 17, Spring Boot, Spring Data JPA
- Database: MySQL
- API: REST (채팅은 현재 3초 주기 갱신)

## 폴더

- `server/src/main/resources/static`: 웹 화면
- `server`: Spring Boot 웹/API 서버
- `docs`: 개발 계획 및 설계 문서

## 개발 시작 순서

1. IntelliJ IDEA 또는 Eclipse와 JDK 17 설치
2. MySQL 8 설치 또는 Docker로 실행
3. `server` 폴더에서 `mvn spring-boot:run` 실행 후 `http://localhost:8080` 접속
4. `/api/health` 응답 확인
5. `docs/DEVELOPMENT_PLAN.md`의 1차 스프린트부터 진행

## VS Code에서 실행

1. VS Code에서 이 저장소 최상위 폴더를 연다.
2. 확장 추천 알림에서 Java Extension Pack, Spring Boot Extension Pack, YAML을 설치한다.
3. `Ctrl+Shift+P` → `Tasks: Run Task` → `우주공강: 서버 실행`을 선택한다.
4. `http://localhost:8080`에 접속한다.

별도의 Maven 설치는 필요 없다. `server/mvnw.cmd`가 필요한 Maven을 자동으로 준비한다. F5를 누르면 `우주공강 Spring Boot 디버그` 설정으로 디버깅할 수 있다.

## 협업 데모

- 회원가입으로 협업자별 계정을 생성합니다. 기본 시연 계정은 `admin` / `admin`입니다.
- 같은 서버에 접속하면 모집글, 참여 인원, 채팅이 모든 브라우저에 공유됩니다.
- 로컬 데이터는 `server/data` H2 파일에 저장됩니다.
- 운영에서는 `DB_URL`, `DB_USERNAME`, `DB_PASSWORD` 환경변수로 MySQL을 연결합니다.

> 비밀번호는 BCrypt로 해시되지만 API 요청 인증은 아직 사용자 이름 헤더를 사용합니다. 외부 공개 전에는 JWT 또는 서버 세션 인증을 추가해야 합니다.
