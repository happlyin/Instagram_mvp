# Context7 MCP 설치 가이드

## ✅ 설치 완료!

Context7 MCP가 성공적으로 설치되었습니다!

---

## 📦 설치된 내용

### 1. Global 패키지 설치
```bash
npm install -g @upstash/context7-mcp
```
✅ 설치 완료: `@upstash/context7-mcp@2.1.0`

### 2. Claude 설정 파일
**위치:** `C:\Users\USER\AppData\Roaming\Claude\claude_desktop_config.json`

**내용:**
```json
{
  "mcpServers": {
    "context7": {
      "command": "npx",
      "args": ["-y", "@upstash/context7-mcp"]
    }
  }
}
```

---

## 🔄 Context7 MCP 활성화 방법

### 중요: Claude Code 재시작 필요!

MCP 설정을 적용하려면 **Claude Code (VSCode 확장)를 재시작**해야 합니다:

1. **VSCode 닫기**
2. **VSCode 다시 열기**
3. Context7 MCP가 자동으로 연결됨

또는 VSCode 내에서:
1. `Ctrl + Shift + P`
2. "Developer: Reload Window" 실행

---

## 🎯 Context7 MCP 기능

Context7 MCP를 통해 다음 정보에 접근할 수 있습니다:

### 1. 최신 라이브러리 문서
- Next.js 14 최신 문서
- React 공식 문서
- TypeORM 문서
- Tailwind CSS 문서
- PostgreSQL 문서

### 2. 실시간 패키지 정보
- npm 패키지 정보
- 최신 버전 확인
- 설치 가이드

### 3. GitHub 저장소 정보
- 공식 저장소 README
- 이슈 및 PR 정보
- 릴리스 노트

---

## 💬 사용 예시

MCP가 활성화되면 다음과 같이 질문할 수 있습니다:

```
"Next.js 14의 최신 Server Actions 문서를 보여줘"
"TypeORM에서 PostgreSQL 연결하는 최신 방법은?"
"Tailwind CSS 3.4의 새로운 기능은?"
```

---

## 🔧 설정 커스터마이징

### 추가 MCP 서버 설정

`claude_desktop_config.json`에 다른 MCP 서버도 추가할 수 있습니다:

```json
{
  "mcpServers": {
    "context7": {
      "command": "npx",
      "args": ["-y", "@upstash/context7-mcp"]
    },
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/path/to/allowed/files"]
    },
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "your_token_here"
      }
    }
  }
}
```

---

## 🐛 문제 해결

### MCP가 작동하지 않는 경우

1. **VSCode/Claude Code 재시작 확인**
   - 반드시 재시작해야 설정이 적용됩니다

2. **설정 파일 위치 확인**
   ```bash
   # Windows
   C:\Users\USER\AppData\Roaming\Claude\claude_desktop_config.json
   ```

3. **패키지 설치 확인**
   ```bash
   npm list -g @upstash/context7-mcp
   ```

4. **로그 확인**
   - VSCode 출력 패널에서 "Claude Code" 로그 확인

### 재설치가 필요한 경우

```bash
# 패키지 제거
npm uninstall -g @upstash/context7-mcp

# 재설치
npm install -g @upstash/context7-mcp

# VSCode 재시작
```

---

## 📚 참고 링크

- [Context7 MCP GitHub](https://github.com/upstash/context7-mcp)
- [Model Context Protocol 공식 문서](https://modelcontextprotocol.io/)
- [Claude Code MCP 가이드](https://docs.anthropic.com/claude/docs/model-context-protocol)

---

## ✨ 다음 단계

1. ✅ Context7 MCP 설치 완료
2. 🔄 **VSCode/Claude Code 재시작** (중요!)
3. 🎯 최신 문서 참조하며 개발 시작!

---

## 💡 팁

Context7 MCP는 다음과 같은 상황에서 특히 유용합니다:

- 🆕 새로운 프레임워크 기능 사용 시
- 📚 공식 문서 베스트 프랙티스 확인
- 🐛 최신 버그 픽스 및 해결책 찾기
- 🔄 마이그레이션 가이드 참조

개발하면서 모르는 것이 있으면 언제든지 최신 문서를 참조할 수 있습니다!
