# Docker 설치 가이드 (Windows)

## 📦 Docker Desktop 설치

### 1. Docker Desktop 다운로드

**공식 사이트에서 다운로드:**
- https://www.docker.com/products/docker-desktop/

**또는 직접 링크:**
- https://desktop.docker.com/win/main/amd64/Docker%20Desktop%20Installer.exe

### 2. 설치 전 요구사항 확인

#### Windows 10/11 요구사항:
- Windows 10 64-bit: Pro, Enterprise, Education (Build 19041 이상)
- Windows 11 64-bit: Home, Pro, Enterprise, Education
- WSL 2 기능 활성화 필요

#### WSL 2 설치 (필수)

관리자 권한 PowerShell에서 실행:

```powershell
# WSL 2 설치
wsl --install

# 또는 수동 설치
dism.exe /online /enable-feature /featurename:Microsoft-Windows-Subsystem-Linux /all /norestart
dism.exe /online /enable-feature /featurename:VirtualMachinePlatform /all /norestart

# 컴퓨터 재시작 후
wsl --set-default-version 2
```

### 3. Docker Desktop 설치

1. 다운로드한 `Docker Desktop Installer.exe` 실행
2. 설치 옵션:
   - ✅ "Use WSL 2 instead of Hyper-V" 체크 (권장)
   - ✅ "Add shortcut to desktop" 체크 (선택)
3. "Install" 클릭
4. 설치 완료 후 **컴퓨터 재시작**

### 4. Docker Desktop 실행

1. Docker Desktop 앱 실행
2. 약관 동의
3. Docker가 시작될 때까지 대기 (하단 아이콘이 초록색이 되면 완료)

### 5. 설치 확인

PowerShell 또는 CMD에서:

```bash
docker --version
docker-compose --version
```

정상적으로 버전이 출력되면 설치 완료!

---

## 🚀 Instagram MVP에서 Docker 사용하기

### 1. Docker Compose로 서비스 시작

프로젝트 폴더에서:

```bash
cd c:\Users\USER\Documents\GitHub\Instagram_mvp
docker-compose up -d
```

이 명령어는 다음을 실행합니다:
- **PostgreSQL** 데이터베이스 (포트 5432)
- **Localstack** S3 (포트 4566)

### 2. 서비스 상태 확인

```bash
# 실행 중인 컨테이너 확인
docker ps

# 로그 확인
docker-compose logs

# 특정 서비스 로그
docker-compose logs postgres
docker-compose logs localstack
```

### 3. 서비스 중지

```bash
# 중지 (데이터 유지)
docker-compose stop

# 중지 및 컨테이너 삭제 (데이터 유지)
docker-compose down

# 중지 및 모든 데이터 삭제
docker-compose down -v
```

### 4. 서비스 재시작

```bash
docker-compose restart
```

---

## 🔧 문제 해결

### Docker Desktop이 시작되지 않음
- WSL 2가 제대로 설치되었는지 확인
- Windows 업데이트 확인
- 가상화가 BIOS에서 활성화되어 있는지 확인

### "Docker daemon is not running"
- Docker Desktop 앱이 실행 중인지 확인
- Docker Desktop을 관리자 권한으로 실행

### 포트 충돌 (5432, 4566)
```bash
# 포트 사용 중인 프로세스 확인
netstat -ano | findstr :5432
netstat -ano | findstr :4566

# 해당 프로세스 종료 또는 docker-compose.yml에서 포트 변경
```

### WSL 2 설치 오류
```powershell
# Windows 버전 확인
winver

# Windows 업데이트 확인 및 설치
# 설정 > 업데이트 및 보안 > Windows Update
```

---

## 📚 참고 링크

- [Docker Desktop 공식 문서](https://docs.docker.com/desktop/install/windows-install/)
- [WSL 2 설치 가이드](https://learn.microsoft.com/ko-kr/windows/wsl/install)
- [Docker Compose 문서](https://docs.docker.com/compose/)

---

## 🎯 다음 단계

Docker 설치 완료 후:

1. ✅ Docker Desktop 실행
2. ✅ `docker-compose up -d` 실행
3. ✅ PostgreSQL 접속 확인
4. ✅ 개발 시작!
