// 이 파일은 학생이 같은 프로젝트에서 이어서 구현합니다.
// 제공 UI를 받은 것만으로 단계 완료를 인정하지 않습니다.
export function createStudentView() {
  return {
    renderIdentity({ me, devices, sessions } = {}) {
      const root = document.createElement('div');
      root.className = 'student-identity';

      const addText = (text, parent = root, tag = 'p') => {
        const node = document.createElement(tag);
        node.textContent = String(text);
        parent.appendChild(node);
        return node;
      };
      const resources = [
        ['로그인 정보', me],
        ['기기 목록', devices],
        ['세션 목록', sessions],
      ];
      const modeLabels = {
        demo: '예제 자료',
        disconnected: '연결 없음',
        unknown: '확인 불가',
      };
      const deviceStatusLabels = {
        compliant: '보안 기준 충족',
        noncompliant: '보안 기준 미충족',
        unknown: '확인 불가',
      };
      const sessionStatusLabels = {
        active: '활성',
        expired: '만료',
        revoked: '철회됨',
        unknown: '확인 불가',
      };
      const statusText = (labels, value) => Object.hasOwn(labels, value)
        ? labels[value]
        : `확인 불가${value == null ? '' : ` (${String(value)})`}`;

      for (const [name, resource] of resources) {
        if (resource?.mode && Object.hasOwn(modeLabels, resource.mode)) {
          addText(`${name} 모드: ${modeLabels[resource.mode]}`);
        }
      }

      const errors = resources.filter(([, resource]) => resource?.status === 'error');
      if (errors.length > 0) {
        for (const [name, resource] of errors) {
          const error = resource.error;
          const message = typeof error?.message === 'string' && error.message
            ? error.message
            : '서버가 오류 메시지를 제공하지 않았습니다.';
          const unverified = ['CONTRACT_MISMATCH', 'ENGINE_RESULT_UNVERIFIED'].includes(error?.code);
          addText(`${name}: ${unverified ? '확인 불가' : '연결 실패'}: ${message}`);
        }
        for (const [name, resource] of resources) {
          if (resource?.status === 'loading') addText(`${name}: 불러오는 중`);
        }
        addText('오류가 있어 현재 사용자·기기·세션 정보는 표시하지 않습니다.');
        return root;
      }

      if (me?.status === 'loading') {
        addText('사용자 정보를 불러오는 중');
      } else if (me?.status === 'ok' && me.data?.user
        && typeof me.data.user.label === 'string' && typeof me.data.user.id === 'string') {
        addText(`사용자: ${me.data.user.label} (ID: ${me.data.user.id})`);
      } else {
        addText('사용자 정보: 확인 불가');
      }

      const currentDevice = me?.status === 'ok' ? me.data?.device : null;
      if (devices?.status === 'loading') addText('기기 목록: 불러오는 중');
      if (me?.status === 'loading' && devices?.status === 'ok') {
        addText('로그인 정보를 불러오는 중이므로 현재 기기를 식별할 수 없습니다.');
      } else if (currentDevice && typeof currentDevice.id === 'string' && typeof currentDevice.label === 'string') {
        const listedDevice = devices?.status === 'ok' && Array.isArray(devices.data)
          ? devices.data.find(device => device?.id === currentDevice.id
            && typeof device.label === 'string' && typeof device.status === 'string')
          : null;
        const device = listedDevice || currentDevice;
        const deviceWarning = device.status === 'noncompliant';
        const deviceLine = addText(`${deviceWarning ? '주의: ' : ''}기기: ${device.label} (ID: ${device.id}) · ${statusText(deviceStatusLabels, device.status)}`);
        if (deviceWarning) deviceLine.style.fontWeight = 'bold';
      } else {
        addText('현재 기기 정보: 확인 불가');
      }
      if (!['loading', 'ok'].includes(devices?.status)) addText('기기 목록 상태: 확인 불가');

      const currentSession = me?.status === 'ok' ? me.data?.session : null;
      if (sessions?.status === 'loading') addText('세션 목록: 불러오는 중');
      if (me?.status === 'loading' && sessions?.status === 'ok') {
        addText('로그인 정보를 불러오는 중이므로 현재 세션을 식별할 수 없습니다.');
      } else if (currentSession && typeof currentSession.id === 'string') {
        const listedSession = sessions?.status === 'ok' && Array.isArray(sessions.data)
          ? sessions.data.find(session => session?.id === currentSession.id && typeof session.status === 'string')
          : null;
        const session = listedSession || currentSession;
        const sessionWarning = session.status === 'expired' || session.status === 'revoked';
        const sessionLine = addText(`${sessionWarning ? '주의: ' : ''}세션 ID: ${session.id} · ${statusText(sessionStatusLabels, session.status)}`);
        if (sessionWarning) sessionLine.style.fontWeight = 'bold';
      } else {
        addText('현재 세션 정보: 확인 불가');
      }
      if (!['loading', 'ok'].includes(sessions?.status)) addText('세션 목록 상태: 확인 불가');

      return root;
    },
    renderDecision({ status, mode, data, error, appId } = {}) {
      const root = document.createElement('div');
      root.className = 'student-decision';

      const addText = (text, parent = root, tag = 'p') => {
        const node = document.createElement(tag);
        node.textContent = String(text);
        parent.appendChild(node);
        return node;
      };
      const appText = (id) => (typeof id === 'string' && id ? `앱 ID: ${id}` : '앱 ID: 확인 불가');

      // 1) 요청 상태 구분: idle · loading · ok · error. 그 밖의 값은 확인 불가로 처리합니다.
      if (status === 'idle') {
        addText('앱을 골라 접속을 요청하세요.');
        return root;
      }
      if (status === 'loading') {
        addText(`판정 확인 중 · ${appText(appId)}`);
        return root;
      }
      if (status === 'error') {
        // 4) 요청 실패는 서버의 거부 판정과 다릅니다.
        const message = typeof error?.message === 'string' && error.message
          ? error.message
          : '서버가 오류 메시지를 제공하지 않았습니다.';
        const failLine = addText(`요청 실패: ${message}`);
        failLine.style.fontWeight = 'bold';
        addText(appText(appId));
        addText('거부(deny) 판정이 아닙니다. 서버의 판정을 받지 못했으므로 허용되지 않음으로 표시합니다.');
        return root;
      }
      if (status !== 'ok' || !data || typeof data !== 'object') {
        addText('판정: 확인 불가(unknown) · 허용되지 않음');
        addText(`요청 상태를 확인할 수 없습니다${status == null ? '' : ` (받은 값: ${String(status)})`}.`);
        return root;
      }

      // 2) 판정 표시: 한국어 뜻과 원래 코드값을 함께 적습니다. 목록에 없는 값은 확인 불가입니다.
      const decisionLabels = {
        allow: '허용(allow)',
        deny: '거부(deny)',
        challenge: '추가 확인 필요(challenge)',
        unknown: '확인 불가(unknown)',
      };
      const known = Object.hasOwn(decisionLabels, data.decision);
      const decision = known ? data.decision : 'unknown';
      addText(appText(data.appId ?? appId));
      const decisionLine = addText(`판정: ${decisionLabels[decision]}`);
      decisionLine.style.fontWeight = 'bold';
      if (!known) {
        addText(`서버가 보낸 판정 값을 확인할 수 없습니다 (받은 값: ${data.decision == null ? '없음' : String(data.decision)}). 허용되지 않음.`);
      } else if (decision === 'unknown') {
        addText('서버가 판정을 확인하지 못했습니다. 허용되지 않음.');
      } else if (decision === 'challenge') {
        addText('추가 인증 또는 확인이 필요합니다. 이 화면은 추가 확인 절차를 대신 수행하지 않습니다.');
      }

      // 3) 판정 이유와 판정 시각을 함께 적습니다.
      addText(`판정 이유: ${typeof data.reason === 'string' && data.reason ? data.reason : '확인 불가'}`);
      addText(`판정 시각: ${typeof data.checkedAt === 'string' && data.checkedAt ? data.checkedAt : '확인 불가'}`);
      return root;
    },
    renderEvents() { return '학생 구현 대기: 본인 접속·XDR 기록을 연결하세요.'; },
    renderStatus() { return '학생 구현 대기: 기기·세션·알림과 연결 점검 상태를 구분하세요.'; },
    renderVulnerabilities() { return '학생 구현 대기: 정확한 설치 버전·OSV 출처·조회 시각·부분 결과·조회 실패를 구분하세요.'; },
    renderAiConnection() { return '학생 구현 대기: 모델 응답 점검과 실제 사건 설명을 구분하고 AI 오류·취소·수동 복구를 안내하세요.'; },
    renderExplanation() { return '학생 구현 대기: 선택한 사건의 근거·규칙·현재 상태와 AI 설명을 연결하세요. 제안은 자동 실행하지 않습니다.'; },
    renderAction() { return '학생 구현 대기: 현재 사건·조치·실제 대상·사람 확인·ACK와 원천 효과·unknown을 구분하세요.'; },
  };
}
