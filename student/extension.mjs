// 이 파일은 학생이 같은 프로젝트에서 이어서 구현합니다.
// 제공 UI를 받은 것만으로 단계 완료를 인정하지 않습니다.
export function createStudentView() {
  // 15단계: 보안 기록 필터 선택값. 다시 그려도 유지하고, 새 자료에 없는 값이면 all로 돌립니다.
  const eventFilters = { kind: 'all', appId: 'all', access: 'all' };
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
    renderEvents({ status, mode, data, error } = {}) {
      const root = document.createElement('div');
      root.className = 'student-events';

      const addText = (text, parent = root, tag = 'p') => {
        const node = document.createElement(tag);
        node.textContent = String(text);
        parent.appendChild(node);
        return node;
      };
      const modeLabels = { demo: '예제 자료', disconnected: '연결 없음', unknown: '확인 불가' };
      const kindLabels = { access: '접속 기록(access)', xdr: 'XDR 경보(xdr)' };
      const stateLabels = {
        access: { allowed: '허용(allowed)', denied: '거부(denied)', unknown: '확인 불가(unknown)' },
        session: { active: '활성(active)', expired: '만료(expired)', revoked: '철회됨(revoked)', unknown: '확인 불가(unknown)' },
        device: { compliant: '보안 기준 충족(compliant)', noncompliant: '보안 기준 미충족(noncompliant)', unknown: '확인 불가(unknown)' },
      };
      const labelOf = (labels, value) => Object.hasOwn(labels, value)
        ? labels[value]
        : `확인 불가(받은 값: ${value == null ? '없음' : String(value)})`;
      const appText = (appId) => (typeof appId === 'string' && appId
        ? appId
        : '앱을 확인할 수 없음(appId 없음)');
      const timeText = (at) => {
        const ms = Date.parse(at);
        if (typeof at !== 'string' || !Number.isFinite(ms)) return '확인 불가';
        const kst = new Date(ms + 9 * 60 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' ');
        return `${at} (한국 시각 ${kst})`;
      };

      // 새로 불릴 때마다 새 root를 만들고 상세 선택을 비웁니다. 이전 목록·상세는 남지 않습니다.
      let selectedEventId = null;

      if (mode && Object.hasOwn(modeLabels, mode)) addText(`보안 기록 모드: ${modeLabels[mode]}`);

      if (status === 'loading') {
        addText('보안 기록을 불러오는 중입니다.').setAttribute('role', 'status');
        return root;
      }
      if (status === 'error') {
        const message = typeof error?.message === 'string' && error.message
          ? error.message
          : '서버가 오류 메시지를 제공하지 않았습니다.';
        const unverified = ['CONTRACT_MISMATCH', 'ENGINE_RESULT_UNVERIFIED'].includes(error?.code);
        const failLine = addText(unverified
          ? `기록을 확인할 수 없습니다(확인 불가, ${error.code}): ${message}`
          : `기록을 불러오지 못했습니다: ${message}`);
        failLine.setAttribute('role', 'alert');
        failLine.style.fontWeight = 'bold';
        addText('조회에 실패했으므로 기록 목록을 표시하지 않습니다. 기록이 없다는 뜻이 아닙니다.');
        return root;
      }
      if (status !== 'ok' || !Array.isArray(data)) {
        addText(`보안 기록 상태를 확인할 수 없습니다(확인 불가)${status == null ? '' : ` (받은 값: ${String(status)})`}.`);
        return root;
      }
      if (data.length === 0) {
        addText('표시할 기록이 없습니다.').setAttribute('role', 'status');
        return root;
      }

      // 1) 받은 배열을 복사해 at 기준 최신순으로 정렬합니다. 원본 data는 바꾸지 않습니다.
      const timeOf = (event) => {
        const ms = Date.parse(event?.at);
        return Number.isFinite(ms) ? ms : -Infinity;
      };
      const events = data.slice().sort((a, b) => timeOf(b) - timeOf(a));

      // 3) 필터: 전체 값은 all, 나머지는 받은 원래 kind·appId·state.access 값입니다.
      const filterDefs = [
        { key: 'kind', name: '기록 종류', valueOf: (e) => e?.kind, optionText: (v) => labelOf(kindLabels, v) },
        { key: 'appId', name: '업무 앱', valueOf: (e) => e?.appId, optionText: (v) => v },
        { key: 'access', name: '접속 상태', valueOf: (e) => e?.state?.access, optionText: (v) => labelOf(stateLabels.access, v) },
      ];
      const filterBox = document.createElement('div');
      filterBox.className = 'student-event-filters';
      root.appendChild(filterBox);
      for (const def of filterDefs) {
        const values = [...new Set(events.map(def.valueOf).filter((v) => typeof v === 'string' && v))];
        if (eventFilters[def.key] !== 'all' && !values.includes(eventFilters[def.key])) eventFilters[def.key] = 'all';
        const selectId = `student-event-filter-${def.key}`;
        const label = document.createElement('label');
        label.htmlFor = selectId;
        label.textContent = def.name;
        const select = document.createElement('select');
        select.id = selectId;
        const allOption = document.createElement('option');
        allOption.value = 'all';
        allOption.textContent = '전체';
        select.appendChild(allOption);
        for (const value of values) {
          const option = document.createElement('option');
          option.value = value;
          option.textContent = def.optionText(value);
          select.appendChild(option);
        }
        select.value = eventFilters[def.key];
        select.addEventListener('change', () => {
          eventFilters[def.key] = select.value;
          draw();
        });
        filterBox.appendChild(label);
        filterBox.appendChild(select);
      }

      const countLine = addText('');
      countLine.setAttribute('role', 'status');
      const list = document.createElement('ul');
      list.className = 'student-event-list';
      root.appendChild(list);
      const detailBox = document.createElement('div');
      detailBox.className = 'student-event-detail-area';
      root.appendChild(detailBox);

      // 4) 선택한 기록의 근거·규칙·세 상태를 나눠 표시합니다.
      const drawDetail = (event) => {
        detailBox.replaceChildren();
        if (!event) return;
        const detail = document.createElement('section');
        detail.setAttribute('data-student-event-detail', String(event.id));
        detail.setAttribute('aria-label', `${event.id} 상세 내용`);
        addText(`사건 ID: ${event.id} 상세`, detail, 'h4');
        addText(`앱 ID: ${appText(event.appId)}`, detail);

        addText('근거(evidence)', detail, 'h5');
        const evidence = Array.isArray(event.evidence) ? event.evidence : [];
        if (evidence.length === 0) addText('근거 없음', detail);
        else {
          const ul = document.createElement('ul');
          for (const item of evidence) addText(`${item?.id}: ${item?.text}`, ul, 'li');
          detail.appendChild(ul);
        }

        addText('규칙(rules)', detail, 'h5');
        const rules = Array.isArray(event.rules) ? event.rules : [];
        if (rules.length === 0) addText('규칙 없음', detail);
        else {
          const ul = document.createElement('ul');
          for (const item of rules) addText(`${item?.id}: ${item?.text}`, ul, 'li');
          detail.appendChild(ul);
        }

        addText('상태(state)', detail, 'h5');
        const stateList = document.createElement('ul');
        addText(`접속(access): ${labelOf(stateLabels.access, event.state?.access)}`, stateList, 'li');
        addText(`세션(session): ${labelOf(stateLabels.session, event.state?.session)}`, stateList, 'li');
        addText(`기기(device): ${labelOf(stateLabels.device, event.state?.device)}`, stateList, 'li');
        detail.appendChild(stateList);

        // 16단계: 연결되지 않은 조치가 넘어온 경우에만 비활성 「<action> 미지원」 버튼을 둡니다.
        // 버튼은 비활성이며 어떤 요청도 보내지 않습니다. supportedActions가 비어 있으면 만들지 않습니다.
        const actions = Array.isArray(event.supportedActions)
          ? event.supportedActions.filter((action) => typeof action === 'string' && action)
          : [];
        if (actions.length > 0) {
          addText('조치(supportedActions)', detail, 'h5');
          const note = addText('아직 지원하지 않는 조치입니다. 조치 실행 연결은 준비 중이며, 아래 버튼은 요청을 보내지 않습니다.', detail);
          note.id = `student-unsupported-note-${String(event.id)}`;
          const actionBox = document.createElement('div');
          for (const action of actions) {
            const button = document.createElement('button');
            button.type = 'button';
            button.disabled = true;
            button.textContent = `${action} 미지원`;
            button.setAttribute('aria-describedby', note.id);
            actionBox.appendChild(button);
          }
          detail.appendChild(actionBox);
        }
        detailBox.appendChild(detail);
      };

      // 2) 각 행에 id·시각·종류·앱·요약을 글자로 적고 data-student-event-id를 붙입니다.
      const draw = () => {
        const shown = events.filter((event) => filterDefs.every((def) => eventFilters[def.key] === 'all'
          || def.valueOf(event) === eventFilters[def.key]));
        if (!shown.some((event) => event.id === selectedEventId)) selectedEventId = null;
        countLine.textContent = `표시 중인 기록: ${shown.length}건 / 받은 기록: ${events.length}건`;
        list.replaceChildren();
        if (shown.length === 0) addText('선택한 필터에 맞는 기록이 없습니다.', list, 'li');
        for (const event of shown) {
          const item = document.createElement('li');
          item.setAttribute('data-student-event-id', String(event.id));
          addText(`사건 ID: ${event.id}`, item);
          addText(`시각: ${timeText(event.at)}`, item);
          addText(`종류: ${labelOf(kindLabels, event.kind)}`, item);
          addText(`앱: ${appText(event.appId)}`, item);
          addText(`요약: ${event.summary}`, item);
          const button = document.createElement('button');
          button.type = 'button';
          button.textContent = `${event.id} 상세`;
          button.setAttribute('aria-expanded', String(event.id === selectedEventId));
          button.addEventListener('click', () => {
            selectedEventId = selectedEventId === event.id ? null : event.id;
            draw();
          });
          item.appendChild(button);
          list.appendChild(item);
        }
        drawDetail(shown.find((event) => event.id === selectedEventId));
      };
      draw();
      return root;
    },
    renderStatus({ devices, sessions, notifications, diagnostics, mode } = {}) {
      const root = document.createElement('div');
      root.className = 'student-status';

      const addText = (text, parent = root, tag = 'p') => {
        const node = document.createElement(tag);
        node.textContent = String(text);
        parent.appendChild(node);
        return node;
      };
      const addSection = (title) => {
        const section = document.createElement('section');
        section.setAttribute('aria-label', title);
        addText(title, section, 'h4');
        root.appendChild(section);
        return section;
      };
      const modeLabels = { demo: '예제 자료', disconnected: '연결 없음', connected: '연결됨', unknown: '확인 불가' };
      const deviceStatusLabels = { compliant: '보안 기준 충족', noncompliant: '보안 기준 미충족', unknown: '확인 불가' };
      const sessionStatusLabels = { active: '활성', expired: '만료', revoked: '철회됨', unknown: '확인 불가' };
      const labelOf = (labels, value) => Object.hasOwn(labels, value)
        ? `${labels[value]}(${value})`
        : `확인 불가(받은 값: ${value == null ? '없음' : String(value)})`;
      const UNVERIFIED_CODES = ['CONTRACT_MISMATCH', 'ENGINE_RESULT_UNVERIFIED'];
      const REFRESH_GUIDE = '다시 시도는 위쪽 「다시 불러오기」 버튼을 직접 누르세요. 자동으로 다시 요청하지 않습니다.';
      const DIAG_GUIDE = '다시 시도는 아래 제공 화면의 「도움정보 불러오기」 버튼을 직접 누르세요. 자동으로 다시 요청하지 않습니다.';

      // 실패 문장: 무엇을 불러오지 못했는지 + code + message. 시간 초과와 확인 불가는 따로 드러냅니다.
      const failureText = (object, error) => {
        const code = typeof error?.code === 'string' && error.code ? error.code : '코드 없음';
        const message = typeof error?.message === 'string' && error.message
          ? error.message
          : '서버가 오류 메시지를 제공하지 않았습니다.';
        if (code === 'TIMEOUT' || /TIMEOUT$/.test(code)) return `${object} 불러오지 못했습니다(시간 초과, ${code}): ${message}`;
        if (UNVERIFIED_CODES.includes(code)) return `${object} 확인할 수 없습니다(확인 불가, ${code}): ${message}`;
        return `${object} 불러오지 못했습니다(오류, ${code}): ${message}`;
      };
      const showFailure = (parent, object, error, guide) => {
        const line = addText(failureText(object, error), parent);
        line.setAttribute('role', 'alert');
        line.style.fontWeight = 'bold';
        addText('조회에 실패했으므로 목록을 표시하지 않습니다. 목록이 비어 있다는 뜻이 아닙니다.', parent);
        addText(guide, parent);
      };

      if (mode && Object.hasOwn(modeLabels, mode)) addText(`상태 모드: ${modeLabels[mode]}(${mode})`);

      // 1) 기기·세션: 불러오는 중 / 실패 / 빈 목록 / 목록 / 확인 불가를 서로 다른 문장으로 표시합니다.
      // 표시할 때마다 새 root를 만들므로, 다시 불러와 성공하면 이전 실패 안내는 남지 않습니다.
      const deviceBox = addSection('등록 기기');
      if (devices?.status === 'loading') {
        addText('등록 기기 목록을 불러오는 중입니다.', deviceBox).setAttribute('role', 'status');
      } else if (devices?.status === 'error') {
        showFailure(deviceBox, '등록 기기 목록을', devices.error, REFRESH_GUIDE);
      } else if (devices?.status === 'ok' && Array.isArray(devices.data)) {
        if (devices.data.length === 0) {
          addText('등록된 기기가 없습니다.', deviceBox).setAttribute('role', 'status');
        } else {
          addText(`받은 기기: ${devices.data.length}대 (내 이름으로 등록되고 회수되지 않은 기기, 현재 기기가 맨 앞)`, deviceBox);
          const ul = document.createElement('ul');
          for (const device of devices.data) {
            const warn = device?.status !== 'compliant';
            const li = addText(`${warn ? '주의: ' : ''}${device?.label ?? '이름 없음'} (ID: ${device?.id ?? '확인 불가'}) · 상태: ${labelOf(deviceStatusLabels, device?.status)}`, ul, 'li');
            if (warn) li.style.fontWeight = 'bold';
          }
          deviceBox.appendChild(ul);
        }
      } else {
        addText(`등록 기기 상태를 확인할 수 없습니다(확인 불가${devices?.status == null ? '' : `, 받은 값: ${String(devices.status)}`}).`, deviceBox);
      }

      const sessionBox = addSection('현재 세션');
      addText('세션은 지금 검증된 연결 하나만 표시합니다. 지난 세션 목록이 아닙니다.', sessionBox);
      if (sessions?.status === 'loading') {
        addText('현재 세션 정보를 불러오는 중입니다.', sessionBox).setAttribute('role', 'status');
      } else if (sessions?.status === 'error') {
        showFailure(sessionBox, '현재 세션 정보를', sessions.error, REFRESH_GUIDE);
      } else if (sessions?.status === 'ok' && Array.isArray(sessions.data)) {
        if (sessions.data.length === 0) {
          addText('현재 연결 없음: 검증된 세션이 없습니다.', sessionBox).setAttribute('role', 'status');
        } else {
          const ul = document.createElement('ul');
          for (const session of sessions.data) {
            const warn = session?.status !== 'active';
            const li = addText(`${warn ? '주의: ' : ''}세션 ID: ${session?.id ?? '확인 불가'} · 상태: ${labelOf(sessionStatusLabels, session?.status)}`, ul, 'li');
            if (warn) li.style.fontWeight = 'bold';
          }
          sessionBox.appendChild(ul);
        }
      } else {
        addText(`현재 세션 상태를 확인할 수 없습니다(확인 불가${sessions?.status == null ? '' : `, 받은 값: ${String(sessions.status)}`}).`, sessionBox);
      }

      // 2) 알림: 항목마다 어느 자료(resource)인지, code, message를 글자로 표시합니다.
      const noticeBox = addSection('알림');
      const resourceLabels = {
        me: '로그인 정보', apps: '업무 앱 목록', events: '보안 기록', devices: '등록 기기',
        sessions: '현재 세션', diagnostics: '도움정보', access: '접속 판정',
      };
      // 기기·세션·기록 상태 알림이 아닌 code는 조회 실패 알림입니다.
      const attentionCodes = {
        devices: ['noncompliant', 'unknown'], sessions: ['expired', 'revoked', 'unknown'], events: ['access', 'xdr'],
      };
      if (!Array.isArray(notifications)) {
        addText('알림 정보를 확인할 수 없습니다(확인 불가).', noticeBox);
      } else if (notifications.length === 0) {
        addText('주의할 알림이 없습니다.', noticeBox).setAttribute('role', 'status');
      } else {
        addText(`알림: ${notifications.length}건`, noticeBox);
        const ul = document.createElement('ul');
        for (const notice of notifications) {
          const resource = notice?.resource;
          const code = typeof notice?.code === 'string' && notice.code ? notice.code : '코드 없음';
          const resourceText = Object.hasOwn(resourceLabels, resource) ? `${resourceLabels[resource]}(${resource})` : `확인 불가(${String(resource)})`;
          const isFailure = !(attentionCodes[resource] ?? []).includes(code);
          const codeText = code === 'TIMEOUT' || /TIMEOUT$/.test(code) ? `시간 초과(${code})` : code;
          const li = addText(`${isFailure ? '조회 실패' : '주의'} · 자료: ${resourceText} · 코드: ${codeText} · ${typeof notice?.message === 'string' ? notice.message : '메시지 없음'}`, ul, 'li');
          if (isFailure) {
            li.style.fontWeight = 'bold';
            addText(resource === 'diagnostics' ? DIAG_GUIDE : REFRESH_GUIDE, li, 'span').prepend(' ');
          }
        }
        noticeBox.appendChild(ul);
      }

      // 3) 진단 정보: 제공 화면이 조회해 넘겨 준 값만 씁니다. 학생 코드는 /api/diagnostics를 호출하지 않습니다.
      //    정해진 6개 값만 표시·복사하고, 비밀값 형식이면 표시하지 않습니다.
      const diagBox = addSection('도움정보(연결 점검 결과)');
      const secretPattern = /(?:Bearer\s|sk-[A-Za-z0-9_-]{6,}|PRIVATE KEY|api[_ -]?key|authorization|password|token|비밀번호|토큰)/i;
      const safeValue = (value) => {
        if (typeof value !== 'string' || !value) return '확인 불가';
        if (secretPattern.test(value) || value.length > 200) return '표시하지 않음(비밀값 형식일 수 있음)';
        return value;
      };
      let copyLines = null;
      if (diagnostics?.status === 'loading') {
        addText('도움정보를 불러오는 중입니다.', diagBox).setAttribute('role', 'status');
      } else if (diagnostics?.status === 'error') {
        showFailure(diagBox, '도움정보를', diagnostics.error, DIAG_GUIDE);
      } else if (diagnostics?.status === 'ok' && diagnostics.data && typeof diagnostics.data === 'object') {
        const d = diagnostics.data;
        const fields = [
          ['requestId', d.requestId],
          ['component', d.component],
          ['version', d.version],
          ['checkedAt', d.checkedAt],
          ['engine.mode', d.engine?.mode],
          ['engine.code', d.engine?.code],
        ];
        copyLines = fields.map(([name, value]) => `${name}: ${safeValue(value)}`);
        const ul = document.createElement('ul');
        for (const line of copyLines) addText(line, ul, 'li');
        diagBox.appendChild(ul);
      } else if (diagnostics == null || diagnostics.status === 'idle') {
        addText('도움정보를 아직 불러오지 않았습니다. 필요하면 아래 제공 화면의 「도움정보 불러오기」 버튼을 직접 누르세요.', diagBox);
      } else {
        addText(`도움정보 상태를 확인할 수 없습니다(확인 불가, 받은 값: ${String(diagnostics.status)}).`, diagBox);
      }

      const copyHelp = addText('「도움정보 복사」는 도움을 요청할 때 붙여 넣도록 위의 6개 값(requestId·component·version·checkedAt·engine.mode·engine.code)만 클립보드에 복사합니다. 버튼을 누르기 전에는 복사하거나 전송하지 않습니다.', diagBox);
      copyHelp.id = 'student-diag-copy-help';
      const copyButton = document.createElement('button');
      copyButton.type = 'button';
      copyButton.textContent = '도움정보 복사';
      copyButton.setAttribute('aria-describedby', copyHelp.id);
      copyButton.disabled = copyLines === null;
      diagBox.appendChild(copyButton);
      const copyStatus = addText(copyLines === null ? '복사할 도움정보가 없습니다. 도움정보를 불러온 뒤 사용할 수 있습니다.' : '', diagBox);
      copyStatus.setAttribute('role', 'status');
      copyButton.addEventListener('click', async () => {
        if (copyLines === null) return;
        const text = copyLines.join('\n');
        try {
          await navigator.clipboard.writeText(text);
          copyStatus.textContent = `도움정보 ${copyLines.length}개 값을 클립보드에 복사했습니다. 붙여 넣기 전에 내용을 확인하세요.`;
        } catch {
          copyStatus.textContent = '클립보드에 복사하지 못했습니다. 위 목록을 직접 선택해 Ctrl+C로 복사하세요.';
        }
      });

      return root;
    },
    renderVulnerabilities() { return '학생 구현 대기: 정확한 설치 버전·OSV 출처·조회 시각·부분 결과·조회 실패를 구분하세요.'; },
    renderAiConnection() { return '학생 구현 대기: 모델 응답 점검과 실제 사건 설명을 구분하고 AI 오류·취소·수동 복구를 안내하세요.'; },
    renderExplanation() { return '학생 구현 대기: 선택한 사건의 근거·규칙·현재 상태와 AI 설명을 연결하세요. 제안은 자동 실행하지 않습니다.'; },
    renderAction() { return '학생 구현 대기: 현재 사건·조치·실제 대상·사람 확인·ACK와 원천 효과·unknown을 구분하세요.'; },
  };
}
