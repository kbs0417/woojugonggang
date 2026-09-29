# 협업 실행 방법

## 로컬 개발

1. JDK 17 이상과 Maven 3.9 이상을 준비한다.
2. `server` 폴더에서 `mvn spring-boot:run`을 실행한다.
3. 모든 협업자가 같은 `http://서버IP:8080`에 접속한다.
4. 협업자별로 다른 아이디와 공용 데모 비밀번호 `admin`을 사용한다.

서버가 동작하는 동안 모든 브라우저는 같은 API와 DB를 사용한다. 개발 기본값은 `server/data`의 H2 파일 DB이다.

## 외부 배포

실제 협업자가 서로 다른 네트워크에서 접속하려면 Spring Boot 서버와 MySQL을 항상 켜져 있는 환경에 배포해야 한다.

```text
DB_URL=jdbc:mysql://DB주소:3306/woojugonggang?serverTimezone=Asia/Seoul&characterEncoding=UTF-8
DB_USERNAME=사용자
DB_PASSWORD=비밀번호
APP_DEMO_PASSWORD=팀원용-공용-비밀번호
ALLOWED_ORIGINS=https://woojugonggang.vercel.app
```

- Spring Boot가 프론트엔드까지 제공하면 `js/config.js`를 수정할 필요가 없다.
- Vercel에 정적 화면만 따로 배포하면 `js/config.js`의 `WOOJOO_API_URL`을 배포한 Spring Boot 주소로 변경한다.
- 현재 인증은 시연용이다. 외부 사용자에게 공개하기 전에 Spring Security 기반 인증으로 교체한다.

## 구현된 공유 기능

- 협업자별 프로필과 시간표
- 모든 사용자가 보는 모집글
- 모집 참여/취소와 정원 검증
- 참여자 전용 채팅 조회/전송
- 모집글과 채팅의 주기적 자동 새로고침
