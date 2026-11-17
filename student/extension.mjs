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
    // 17단계: AI 연결 점검 결과 표시. 연결 점검(모델 목록 응답)은 사건 설명 실행이 아닙니다.
    // 호출될 때마다 새 root를 만들므로, 다시 점검해 성공하거나 idle로 돌아오면 이전 결과는 남지 않습니다.
    renderAiConnection({ status, mode, data, error, checkedAt, explanationAccepted } = {}) {
      const root = document.createElement('div');
      root.className = 'student-ai-connection';
      root.setAttribute('data-state', typeof status === 'string' ? status : 'unknown');

      const addText = (text, parent = root, tag = 'p') => {
        const node = document.createElement(tag);
        node.textContent = String(text);
        parent.appendChild(node);
        return node;
      };
      // mode는 응답 출처(예제 자료 여부)입니다. AI 연결 결과가 아니므로 예제 응답일 때만 표시합니다.
      const modeLabels = { demo: '예제 응답(demo) · 실제 게이트 수용 아님' };
      const secretPattern = /(?:Bearer\s|sk-[A-Za-z0-9_-]{6,}|PRIVATE KEY|api[_ -]?key|authorization|password|token|비밀번호|토큰)/i;
      const safeText = (value, fallback) => {
        if (typeof value !== 'string' || !value) return fallback;
        if (secretPattern.test(value) || value.length > 300) return '표시하지 않음(비밀값 형식일 수 있음)';
        return value;
      };
      const MANUAL_GUIDE = '다시 점검은 「현재 API 연결 점검」 버튼을 직접 누르세요. 자동으로 다시 점검하지 않습니다.';
      const NOT_RUN = '사건 설명은 아직 실행하지 않았습니다. 모델 목록 응답은 사건 설명 성공이 아니며, 사건 설명은 보안 기록에서 따로 요청하고 확인합니다.';

      if (mode && Object.hasOwn(modeLabels, mode)) addText(`응답 출처: ${modeLabels[mode]}`);

      if (status === 'idle') {
        addText('AI 연결 점검 전').setAttribute('role', 'status');
        addText('아직 점검 결과가 없습니다. 계정 연결과 AI 연결을 마친 뒤 「현재 API 연결 점검」 버튼을 직접 누르세요.');
        return root;
      }
      if (status === 'loading') {
        addText('AI 연결 점검 중').setAttribute('role', 'status');
        addText('점검을 멈추려면 「AI 연결 점검 취소」 버튼을 누르세요. 취소한 뒤 늦게 도착한 응답은 표시하지 않습니다.');
        return root;
      }
      if (status === 'error') {
        // 원인 분류: 공식 안내 표의 7가지 + 표에 없는 코드는 확인 불가로 묶습니다.
        const groups = [
          { codes: ['ON_AI_PROVISIONING_PENDING', 'ON_AI_TRANSPORT_PENDING', 'ON_AI_AUTHORIZATION_CHANGED', 'SUBJECT_SCOPE_UNVERIFIED', 'AI_REQUEST_UNVERIFIED', 'ON_AI_INVALID_INPUT', 'ON_AI_INVALID_OUTPUT'],
            title: '권한 준비 중·확인 불가', guide: '학생 코드의 잘못이 아닙니다. 담당자에게 계정 연결과 앱 권한 확인을 요청하세요.' },
          { codes: ['WB_CLCO_AUTH_REQUIRED'], title: '인증 실패', guide: '계정 연결을 다시 확인하세요. 계속되면 담당자에게 확인하세요.' },
          { codes: ['WB_CLCO_ACCESS_BLOCKED'], title: '접근 제한', guide: '계정 연결을 다시 확인하세요. 이용 권한과 운영 중지 여부는 담당자에게 확인하세요.' },
          { codes: ['WB_CLCO_COHORT_BUDGET_EXHAUSTED', 'WB_CLCO_LIMIT_REACHED'], title: '반 사용량·이용 한도 초과', guide: '담당자에게 확인하세요.' },
          { codes: ['WB_CLCO_SESSION_CLOSED'], title: '이용 시간 아님', guide: 'AI 이용 시간을 확인하세요.' },
          { codes: ['WB_CLCO_RATE_LIMITED', 'WB_CLCO_TIMEOUT', 'REQUEST_TIMEOUT', 'ENGINE_TIMEOUT', 'TIMEOUT', 'NETWORK_ERROR'],
            title: '요청 제한·시간 초과·네트워크', guide: '잠시 뒤 직접 다시 점검하세요.' },
          { codes: ['CANCELLED', 'WB_CLCO_CANCELLED', 'REQUEST_CANCELLED'], title: '취소됨', guide: '점검을 취소했습니다. 이전 결과는 현재 결과가 아닙니다.' },
          { codes: ['ON_AI_MODEL_LIST_EMPTY', 'MODEL_NOT_CONFIGURED'], title: '쓸 수 있는 모델 없음', guide: '담당자에게 모델 허용 설정 확인을 요청하세요.' },
        ];
        const code = typeof error?.code === 'string' && /^[A-Z0-9_]{1,64}$/.test(error.code) ? error.code : '코드 없음';
        const group = groups.find((g) => g.codes.includes(code))
          ?? { title: '확인 불가', guide: '학생 코드의 잘못이 아닙니다. 담당자에게 계정 연결과 앱 권한 확인을 요청하세요.' };
        const failLine = addText(`AI 연결 점검 실패: ${group.title}`);
        failLine.setAttribute('role', 'alert');
        failLine.style.fontWeight = 'bold';
        addText(`오류 코드: ${code}`);
        addText(`안내: ${safeText(error?.message, '서버가 오류 메시지를 제공하지 않았습니다.')}`);
        addText(`조치: ${group.guide}`);
        addText('연결이 확인되지 않았으므로 성공으로 보지 않습니다. 사건 설명도 실행하지 않았습니다.');
        addText(MANUAL_GUIDE);
        return root;
      }
      if (status !== 'ok' || !data || typeof data !== 'object' || data.transportChecked !== true) {
        addText(`AI 연결 상태를 확인할 수 없습니다(확인 불가${status == null ? '' : `, 받은 값: ${String(status)}`}).`);
        addText(MANUAL_GUIDE);
        return root;
      }

      const authLabels = { test: '시험 연결 점검(test)', verified: '앱 권한 확인 후 점검(verified)' };
      const authKnown = Object.hasOwn(authLabels, data.audienceAuthorization);
      const okLine = addText(`AI 연결 점검 결과: ${authKnown ? authLabels[data.audienceAuthorization] : `확인 불가(받은 값: ${String(data.audienceAuthorization)})`}`);
      okLine.setAttribute('role', 'status');
      okLine.style.fontWeight = 'bold';
      if (data.audienceAuthorization === 'test') addText('시험 연결로 모델 응답만 점검했습니다. 실제 앱 권한 발급·수용이 확인된 것이 아닙니다.');
      if (data.audienceAuthorization === 'verified') addText('점검 시각 기준으로 앱 권한 확인과 모델 응답을 확인했습니다.');
      const kv = document.createElement('dl');
      addText('응답 모델 수', kv, 'dt');
      addText(Number.isInteger(data.modelCount) ? `${data.modelCount}개` : '확인 불가', kv, 'dd');
      addText('점검 시각', kv, 'dt');
      addText(typeof checkedAt === 'string' && checkedAt ? checkedAt : '확인 불가', kv, 'dd');
      root.appendChild(kv);
      const notRun = addText(NOT_RUN);
      notRun.style.fontWeight = 'bold';
      if (explanationAccepted !== false) addText('사건 설명 수용 여부: 확인 불가. 이 화면에서는 사건 설명 결과를 판단하지 않습니다.');
      addText(MANUAL_GUIDE);
      return root;
    },
    // 18단계: 선택한 사건의 AI 설명을 근거·규칙·확인 불가 상태·제안(미실행)과 함께 표시합니다.
    // 근거가 맞지 않거나 실행했다고 답한 설명은 쓰지 않습니다. 호출마다 새 root를 만들어 이전 설명을 지웁니다.
    renderExplanation({ event, explanation, checkedAt } = {}) {
      const root = document.createElement('div');
      root.className = 'student-explanation';

      const addText = (text, parent = root, tag = 'p') => {
        const node = document.createElement(tag);
        node.textContent = String(text);
        parent.appendChild(node);
        return node;
      };
      const addList = (items, parent = root) => {
        const ul = document.createElement('ul');
        for (const item of items) addText(item, ul, 'li');
        parent.appendChild(ul);
        return ul;
      };
      const eventId = typeof event?.id === 'string' && event.id ? event.id : null;
      const status = explanation?.status;
      const safeCode = (value) => (typeof value === 'string' && /^[A-Z0-9_]{1,64}$/.test(value) ? value : null);
      // 실패·자료 없음·근거 불일치 화면: data-student-explanation-event를 붙이지 않습니다.
      const showFailure = (reason, code) => {
        const failLine = addText(`AI 설명 실패: ${reason}`);
        failLine.setAttribute('role', 'alert');
        failLine.style.fontWeight = 'bold';
        if (eventId) addText(`사건 ID: ${eventId}`);
        addText(`오류 코드: ${code ?? '코드 없음'}`);
        addText('기록은 그대로입니다. 보안 기록과 업무 앱 판정은 계속 동작하며, AI 실패는 과제 실패가 아닙니다.');
        return root;
      };

      // 1) 오류는 event가 null이어도 먼저 표시합니다.
      if (status === 'error') {
        const message = typeof explanation.error?.message === 'string' && explanation.error.message
          ? explanation.error.message
          : 'AI 설명을 확인할 수 없습니다.';
        return showFailure(message, safeCode(explanation.error?.code));
      }
      // 2) 오류 없이 기록을 아직 고르지 않음
      if (!eventId) {
        addText('보안 기록에서 기록을 먼저 고르세요').setAttribute('role', 'status');
        return root;
      }
      if (status === 'idle' || status == null) {
        addText(`AI 설명 요청 전 · 사건 ID: ${eventId}`).setAttribute('role', 'status');
        return root;
      }
      if (status === 'loading') {
        addText(`AI 설명 요청 중 · 사건 ID: ${eventId}`).setAttribute('role', 'status');
        return root;
      }
      if (status !== 'ok') return showFailure(`설명 상태를 확인할 수 없습니다(받은 값: ${String(status)})`, null);

      // 2) ok여도 내용이 이 기록과 맞는지 다시 확인하고, 맞지 않으면 지어내지 않고 실패로 보여 줍니다.
      const data = explanation.data;
      if (!data || typeof data !== 'object' || typeof data.summary !== 'string') {
        return showFailure('설명 자료가 없습니다', safeCode(explanation.error?.code));
      }
      if (data.executed !== false) {
        return showFailure('AI가 이미 실행했다고 답한 설명은 쓸 수 없습니다', safeCode(explanation.error?.code));
      }
      const evidence = Array.isArray(event.evidence) ? event.evidence : [];
      const evidenceText = new Map(evidence.filter((row) => typeof row?.id === 'string').map((row) => [row.id, row.text]));
      const proposals = Array.isArray(data.proposals) ? data.proposals : null;
      const cited = Array.isArray(data.evidenceIds) ? data.evidenceIds : null;
      const allRefs = [...(cited ?? []), ...(proposals ?? []).flatMap((p) => (Array.isArray(p?.evidenceIds) ? p.evidenceIds : [null]))];
      if (!cited || !proposals || cited.length === 0 || allRefs.some((ref) => !evidenceText.has(ref))) {
        return showFailure('근거가 맞지 않아 이 설명을 쓸 수 없습니다(인용한 근거 ID가 이 기록에 없음)', safeCode(explanation.error?.code));
      }

      // 3) 성공한 설명에만 성공 표식을 붙입니다.
      root.setAttribute('data-student-explanation-event', eventId);
      addText(`사건 ID: ${eventId}`).style.fontWeight = 'bold';
      addText('AI 설명(참고용)', root, 'h4');
      addText('AI 설명은 해석입니다. 사실 판단은 아래 근거 글과 연동 시스템이 알려 준 상태로 하세요.');
      addText(`AI 요약: ${data.summary}`);

      addText('인용한 근거', root, 'h5');
      addList(cited.map((ref) => `${ref} — ${evidenceText.get(ref)}`));

      addText('규칙', root, 'h5');
      const rules = Array.isArray(event.rules) ? event.rules : [];
      if (rules.length === 0) addText('없음');
      else addList(rules.map((rule) => `${rule?.id} — ${rule?.text}`));

      addText('확인할 수 없는 상태', root, 'h5');
      const stateNames = { access: '접속', session: '세션', device: '기기' };
      const unknownStates = Object.keys(stateNames).filter((key) => event.state?.[key] === 'unknown');
      if (unknownStates.length === 0) addText('없음');
      else addList(unknownStates.map((key) => `${stateNames[key]}: 확인 불가(unknown)`));

      addText('조치 제안', root, 'h5');
      if (proposals.length === 0) {
        const supported = Array.isArray(event.supportedActions) ? event.supportedActions : [];
        addText(supported.length === 0
          ? '연동 시스템이 지원하는 조치가 없어 제안이 없습니다(정상)'
          : 'AI가 제안한 조치가 없습니다');
      } else {
        addList(proposals.map((p) => `${p?.action} — ${p?.reason} · 사람 확인이 필요하며 실행되지 않았습니다`));
      }
      addText(`설명 시각: ${typeof checkedAt === 'string' && checkedAt ? checkedAt : '확인 불가'}`);
      return root;
    },
    // 19단계: 조치 제안·사람 확인·서버 접수(ACK)·실제 효과 관측을 구분해 표시합니다.
    // 버튼·POST 요청·확인 티켓은 만들지 않습니다. 조작은 제공 화면 버튼으로만 합니다.
    // 호출마다 새 root를 만들므로 새 입력이 오면 이전 대상·요청·결과는 남지 않습니다.
    renderAction({ status, event, actionId, target, receipt, observation, message, confirmationExpiresAt, error } = {}) {
      const root = document.createElement('div');
      root.className = 'student-action';

      const addText = (text, parent = root, tag = 'p') => {
        const node = document.createElement(tag);
        node.textContent = String(text);
        parent.appendChild(node);
        return node;
      };
      const secretPattern = /(?:Bearer\s|sk-[A-Za-z0-9_-]{6,}|PRIVATE KEY|api[_ -]?key|authorization|password|token|confirmationId|비밀번호|토큰)/i;
      const safeText = (value, fallback) => {
        if (typeof value !== 'string' || !value) return fallback;
        if (secretPattern.test(value) || value.length > 300) return '표시하지 않음(비밀값 형식일 수 있음)';
        return value;
      };
      const safeCode = (value) => (typeof value === 'string' && /^[A-Z0-9_]{1,64}$/.test(value) ? value : '코드 없음');
      const has = (value) => (typeof value === 'string' && value !== '') || Number.isSafeInteger(value);

      const BTN_CONFIRM = '「대상과 조치를 확인했으며 집행합니다」';
      const BTN_RESULT = '「원천 결과만 재조회」';
      const BTN_CANCEL = '「조치 화면 취소」';

      // 1) 현재 사건과 받은 영수증이 같은 의도(사건·조치)에 묶여 있는지 확인합니다.
      const eventId = has(event?.id) ? event.id : null;
      const bindingMismatch = Boolean(receipt) && (
        (has(receipt.eventId) && receipt.eventId !== eventId)
        || (has(receipt.actionId) && receipt.actionId !== actionId));

      // 2) succeeded는 원천 관측으로 effectApplied===true일 때만 효과 확인입니다. 아니면 결과 불명으로 내립니다.
      const effectConfirmed = status === 'succeeded' && observation?.effectApplied === true && has(observation?.observedAt);
      let shown = status;
      if (status === 'succeeded' && !effectConfirmed) shown = 'unknown';
      if (bindingMismatch && ['pending', 'succeeded', 'denied', 'failed'].includes(shown)) shown = 'unknown';

      const labels = {
        idle: '아직 미실행(idle)',
        loading: '조치 준비 또는 결과 조회 중(loading) · 결과 미확인',
        prepared: '준비됨·미실행(prepared)',
        executing: '서버에 전달 중(executing) · 결과가 아직 없음 · 완료 아님',
        pending: '서버 접수·처리 중(pending) · 접수 응답(ACK)은 효과 확인이 아님',
        succeeded: '효과 확인(succeeded)',
        denied: '거절(denied)',
        failed: '실패(failed)',
        unknown: '결과 불명(unknown) · 성공으로도 효과 없음으로도 판단 금지',
        expired: '확인 기한 지남(expired) · 다시 준비 필요',
        error: '요청 처리 안 됨(error)',
      };
      const known = Object.hasOwn(labels, shown);
      root.setAttribute('data-state', known ? shown : 'unknown');
      const head = addText(known ? labels[shown] : `조치 상태 확인 불가(받은 값: ${String(status)}) · 성공으로 판단하지 않음`);
      head.setAttribute('role', ['error', 'denied', 'failed', 'expired'].includes(shown) ? 'alert' : 'status');
      head.style.fontWeight = 'bold';

      // 3) 상태별 안내
      if (shown === 'idle') {
        addText('조치 제안은 아직 실행되지 않았습니다. AI 제안은 실행이 아니며, 사람이 확인하기 전에는 집행되지 않습니다.');
        addText('연동 시스템이 지원하는 조치가 없는 기록(supportedActions 빈 배열)에서는 조치 준비 버튼이 나오지 않는 것이 정상입니다.');
        if (has(message)) addText(`제공 화면 안내: ${safeText(message, '')}`);
      } else if (shown === 'loading') {
        addText('원천에 확인하는 중입니다. 아직 결과가 확인되지 않았습니다.');
      } else if (shown === 'prepared') {
        addText('아직 집행되지 않았습니다. 아래 사건·조치·실제 대상·확인 기한을 읽은 뒤 사람이 직접 판단하세요.');
        addText(`집행하려면 제공 화면의 ${BTN_CONFIRM} 버튼을 직접 누르세요. 이 칸에는 집행 버튼이 없습니다.`);
        addText(`확인 기한: ${has(confirmationExpiresAt) ? confirmationExpiresAt : '확인 불가'}`);
      } else if (shown === 'executing') {
        addText('사람 확인 후 서버로 전달하고 있습니다. 서버 응답과 원천 효과는 아직 확인되지 않았습니다.');
        addText(`같은 조치를 다시 집행하려 하지 마세요. 응답이 늦으면 ${BTN_RESULT} 버튼으로 결과만 조회하세요.`);
      } else if (shown === 'pending') {
        addText('서버가 요청을 받았다는 뜻일 뿐입니다. 원천에서 효과가 관측되지 않았으므로 완료 아님입니다.');
        addText(`다시 집행하지 말고 ${BTN_RESULT} 버튼으로 결과만 조회하세요.`);
      } else if (shown === 'succeeded') {
        addText(`관측 시각: ${observation.observedAt}`);
        addText('effectApplied: true');
        addText(`receiptId: ${has(receipt?.receiptId) ? receipt.receiptId : '확인 불가'}`);
        addText('연동 시스템이 위 시각에 실제 효과를 관측했습니다. 관측 시각 이후의 상태는 다시 조회해 확인하세요.');
      } else if (shown === 'denied' || shown === 'failed') {
        addText(`연동 시스템 ${shown === 'denied' ? '거절' : '실패'} 사유: ${safeText(message, '서버가 사유를 제공하지 않았습니다.')}`);
        addText('조치 효과가 적용되었다고 보지 않습니다.');
      } else if (shown === 'unknown') {
        if (status === 'succeeded') addText('succeeded를 받았지만 원천 관측(effectApplied: true와 관측 시각)이 없어 효과 확인으로 보지 않습니다.');
        if (bindingMismatch) addText('받은 영수증의 사건 또는 조치가 현재 사건·조치와 다릅니다. 이 결과를 현재 조치의 결과로 쓰지 않습니다.');
        addText(`이미 전달된 조치일 수 있습니다. 다시 집행하지 말고 ${BTN_RESULT} 버튼으로 결과만 재조회하세요.`);
      } else if (shown === 'expired') {
        addText('사람 확인 기한이 지나 이번 준비로는 집행할 수 없습니다. 필요하면 AI 제안에서 조치를 다시 준비하세요.');
      } else if (shown === 'error') {
        addText(`오류 코드: ${safeCode(error?.code)}`);
        addText(`안내: ${safeText(error?.message, '서버가 오류 메시지를 제공하지 않았습니다.')}`);
        addText('요청이 처리되지 않았으므로 성공으로 보지 않습니다.');
      }
      if (shown !== 'error' && error && typeof error === 'object') {
        addText(`오류 코드: ${safeCode(error.code)} · ${safeText(error.message, '메시지 없음')}`);
      }
      if (receipt?.replayed === true) {
        addText('중복 요청 방지: 같은 요청(requestId)의 기존 결과를 다시 받은 응답(replayed: true)입니다. 새로 집행된 것이 아닙니다.');
      }
      if (receipt?.superseded === true) {
        addText('이전 조회 결과는 최신 결과를 대신하지 않습니다(superseded). 결과만 다시 조회하세요.');
      }

      // 4) 받은 범위의 식별자만 글자로 표시합니다. 없는 값은 만들지 않습니다.
      const rows = [];
      if (eventId) rows.push(['사건 ID(event.id)', eventId]);
      const evidenceIds = Array.isArray(event?.evidence) ? event.evidence.map((row) => row?.id).filter(has) : [];
      if (evidenceIds.length > 0) rows.push(['근거 ID', evidenceIds.join(', ')]);
      if (has(actionId)) rows.push(['조치(actionId)', actionId]);
      if (target && has(target.id)) rows.push(['실제 대상(target.id)', target.id]);
      if (target && has(target.generation)) rows.push(['대상 세대(target.generation)', target.generation]);
      if (has(receipt?.requestId)) rows.push(['요청 ID(requestId)', receipt.requestId]);
      if (has(receipt?.receiptId)) rows.push(['영수증 ID(receiptId)', receipt.receiptId]);
      if (has(receipt?.version)) rows.push(['버전(version)', receipt.version]);
      if (has(receipt?.status)) rows.push(['서버 응답 상태(receipt.status)', receipt.status]);
      if (rows.length > 0) {
        const kv = document.createElement('dl');
        for (const [key, value] of rows) {
          addText(key, kv, 'dt');
          addText(value, kv, 'dd');
        }
        root.appendChild(kv);
      }

      if (shown !== 'idle') {
        addText(`${BTN_CANCEL}는 이 화면만 닫습니다. 이미 서버에 전달된 조치의 효과를 되돌리지 않습니다.`);
      }

      // 5) 현재 사건에 묶여 정상적으로 그린 경우에만 표식을 붙입니다.
      if (eventId && known && !bindingMismatch) {
        root.setAttribute('data-student-action-event', eventId);
        if (has(receipt?.requestId)) root.setAttribute('data-student-action-request', receipt.requestId);
      }
      return root;
    },
  };
}
