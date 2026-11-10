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
    renderDecision() { return '학생 구현 대기: 서버의 판정과 이유를 연결하세요.'; },
    renderEvents() { return '학생 구현 대기: 본인 접속·XDR 기록을 연결하세요.'; },
    renderStatus() { return '학생 구현 대기: 기기·세션·알림과 연결 점검 상태를 구분하세요.'; },
    renderVulnerabilities() { return '학생 구현 대기: 정확한 설치 버전·OSV 출처·조회 시각·부분 결과·조회 실패를 구분하세요.'; },
    renderAiConnection() { return '학생 구현 대기: 모델 응답 점검과 실제 사건 설명을 구분하고 AI 오류·취소·수동 복구를 안내하세요.'; },
    renderExplanation() { return '학생 구현 대기: 선택한 사건의 근거·규칙·현재 상태와 AI 설명을 연결하세요. 제안은 자동 실행하지 않습니다.'; },
    renderAction() { return '학생 구현 대기: 현재 사건·조치·실제 대상·사람 확인·ACK와 원천 효과·unknown을 구분하세요.'; },
  };
}
