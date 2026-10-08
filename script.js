// ==========================================================================
// Supabase 설정 상수 (직접 발급받은 값을 입력해주세요)
// ==========================================================================
const SUPABASE_URL = 'https://zqonssltazdhcifoeltt.supabase.co'; // Supabase 프로젝트 URL을 입력하세요
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpxb25zc2x0YXpkaGNpZm9lbHR0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE0MTQwMzUsImV4cCI6MjEwNjk5MDAzNX0.FyR2a3HBL1DqjShisK_9QJis73KQM2uV-S-jUovq14I'; // Supabase anon public API 키를 입력하세요

// Supabase 클라이언트 초기화 (클라이언트 변수명: supabaseClient)
const supabaseClient = (typeof supabase !== 'undefined')
  ? supabase.createClient(SUPABASE_URL, SUPABASE_KEY)
  : null;

// ==========================================================================
// 바이브 카페 주문서 및 주문 내역 자바스크립트 (script.js)
// ==========================================================================

// 문서가 모두 로드된 후 스크립트 실행
document.addEventListener('DOMContentLoaded', function () {
  // ------------------------------------------------------------------------
  // 1. 주문 데이터 상태 관리
  // ------------------------------------------------------------------------
  let orders = [];       // 주문 정보를 저장할 배열 (최신 주문이 맨 앞)
  let orderCounter = 1;  // 주문 고유 번호 (#1, #2, ...)

  // ------------------------------------------------------------------------
  // 2. 주요 HTML 요소 가져오기
  // ------------------------------------------------------------------------
  // [탭 메뉴 요소]
  const tabBtnOrder = document.getElementById('tab-btn-order');         // '주문하기' 탭 버튼
  const tabBtnHistory = document.getElementById('tab-btn-history');     // '주문 내역' 탭 버튼
  const tabOrderContent = document.getElementById('tab-order-content'); // '주문하기' 탭 화면
  const tabHistoryContent = document.getElementById('tab-history-content'); // '주문 내역' 탭 화면
  const orderBadge = document.getElementById('order-badge');             // 주문 건수 뱃지

  // [주문서 폼 요소]
  const orderForm = document.getElementById('order-form');               // 주문서 폼
  const submitBtn = document.getElementById('submit-btn');               // 주문하기 버튼
  const customerNameInput = document.getElementById('customer-name');   // 이름 입력창
  const customerPhoneInput = document.getElementById('customer-phone'); // 전화번호 입력창
  const beverageSelect = document.getElementById('beverage-select');     // 음료 선택 셀렉트박스
  const sizeRadios = document.querySelectorAll('input[name="size"]');   // 사이즈 라디오 버튼 목록
  const optionCheckboxes = document.querySelectorAll('input[name="option"]'); // 추가 옵션 체크박스 목록
  const orderQuantityInput = document.getElementById('order-quantity'); // 수량 입력창
  const orderRequestsInput = document.getElementById('order-requests'); // 요청사항 입력창
  const estimatedPriceSpan = document.getElementById('estimated-price'); // 예상 금액 표시 요소
  const orderConfirmation = document.getElementById('order-confirmation'); // 주문 확인 메시지 영역

  // [주문 내역 요소]
  const orderList = document.getElementById('order-list');               // 주문 목록 컨테이너
  const historyFooter = document.getElementById('history-footer');       // 주문 내역 하단 푸터 (통계/삭제 버튼)
  const historyTotalSummary = document.getElementById('history-total-summary'); // 총 금액 및 건수 표시 요소
  const clearHistoryBtn = document.getElementById('clear-history-btn'); // 내역 모두 지우기 버튼

  // ------------------------------------------------------------------------
  // 3. 탭 전환 기능
  // ------------------------------------------------------------------------
  // '주문하기' 탭 클릭 시
  tabBtnOrder.addEventListener('click', function () {
    tabBtnOrder.classList.add('active');
    tabBtnHistory.classList.remove('active');
    tabOrderContent.classList.remove('hidden');
    tabHistoryContent.classList.add('hidden');
  });

  // '주문 내역' 탭 클릭 시
  tabBtnHistory.addEventListener('click', function () {
    tabBtnHistory.classList.add('active');
    tabBtnOrder.classList.remove('active');
    tabHistoryContent.classList.remove('hidden');
    tabOrderContent.classList.add('hidden');
    renderOrders(); // 탭 이동 시 최신 주문 목록을 화면에 다시 그립니다.
  });

  // ------------------------------------------------------------------------
  // 4. 예상 금액 계산 함수 (calculateTotal)
  //    - 음료, 사이즈, 옵션, 수량을 바탕으로 총 금액을 계산하고 화면에 표시합니다.
  // ------------------------------------------------------------------------
  function calculateTotal() {
    // [1] 음료 가격 확인
    const selectedBeverageOption = beverageSelect.options[beverageSelect.selectedIndex];
    const beveragePrice = selectedBeverageOption ? Number(selectedBeverageOption.dataset.price || 0) : 0;

    // 음료를 선택하지 않은 경우(초기 상태)에는 무조건 0원으로 표시
    if (!beverageSelect.value || beveragePrice === 0) {
      estimatedPriceSpan.textContent = '0';
      return 0;
    }

    // [2] 사이즈 추가금 확인
    const selectedSize = document.querySelector('input[name="size"]:checked');
    const sizePrice = selectedSize ? Number(selectedSize.dataset.price || 0) : 0;

    // [3] 선택된 추가 옵션 추가금 합산
    let optionsPrice = 0;
    const checkedOptions = document.querySelectorAll('input[name="option"]:checked');
    checkedOptions.forEach(function (checkbox) {
      optionsPrice += Number(checkbox.dataset.price || 0);
    });

    // [4] 수량 확인 (숫자가 아니거나 1 미만이면 기본 1로 계산)
    let quantity = parseInt(orderQuantityInput.value, 10);
    if (isNaN(quantity) || quantity < 1) {
      quantity = 1;
    }

    // [5] 총 금액 계산: (음료 기본가 + 사이즈 추가금 + 옵션 추가금) × 수량
    const totalPrice = (beveragePrice + sizePrice + optionsPrice) * quantity;

    // [6] 천 단위 콤마 표기(toLocaleString)를 적용하여 화면에 표시
    estimatedPriceSpan.textContent = totalPrice.toLocaleString();

    return totalPrice;
  }

  // ------------------------------------------------------------------------
  // 5. 실시간 변경 이벤트 리스너 연결
  //    - 값이 바뀔 때마다 calculateTotal()을 호출하여 실시간으로 금액을 갱신합니다.
  // ------------------------------------------------------------------------
  beverageSelect.addEventListener('change', calculateTotal);

  sizeRadios.forEach(function (radio) {
    radio.addEventListener('change', calculateTotal);
  });

  optionCheckboxes.forEach(function (checkbox) {
    checkbox.addEventListener('change', calculateTotal);
  });

  orderQuantityInput.addEventListener('input', calculateTotal);
  orderQuantityInput.addEventListener('change', calculateTotal);

  // ------------------------------------------------------------------------
  // 6. 주문하기 버튼 클릭(폼 제출) 이벤트 처리 (Supabase DB 연동)
  // ------------------------------------------------------------------------
  orderForm.addEventListener('submit', async function (event) {
    event.preventDefault(); // 폼 기본 새로고침 방지

    // [유효성 검사 1] 이름 입력 확인
    const customerName = customerNameInput.value.trim();
    if (!customerName) {
      alert('이름을 입력해주세요');
      customerNameInput.focus();
      return;
    }

    // [유효성 검사 2] 전화번호 입력 확인
    const customerPhone = customerPhoneInput.value.trim();
    if (!customerPhone) {
      alert('전화번호를 입력해주세요');
      customerPhoneInput.focus();
      return;
    }

    // [유효성 검사 3] 음료 선택 확인
    if (!beverageSelect.value) {
      alert('음료를 선택해주세요');
      beverageSelect.focus();
      return;
    }

    // --- 주문 정보 추출 ---
    // 음료 명칭 추출 (예: "카페라떼 4,000원" -> "카페라떼")
    const selectedOption = beverageSelect.options[beverageSelect.selectedIndex];
    const drinkName = selectedOption.textContent.replace(/\s*[0-9,]+원$/, '').trim();
    // 음료 기본 가격 추출
    const beveragePrice = Number(selectedOption.dataset.price || 0);

    // 사이즈 추출 (예: "M")
    const selectedSizeRadio = document.querySelector('input[name="size"]:checked');
    const sizeName = selectedSizeRadio ? selectedSizeRadio.value : 'M';

    // 선택된 추가 옵션 목록 추출 (배열)
    const checkedBoxes = document.querySelectorAll('input[name="option"]:checked');
    const optionNames = [];
    checkedBoxes.forEach(function (box) {
      const label = document.querySelector(`label[for="${box.id}"]`);
      if (label) {
        // 라벨에서 금액 제거 (예: "샷 추가 (+500원)" -> "샷 추가")
        const cleanName = label.textContent.replace(/\s*\(\+?[0-9,]+원\)/, '').trim();
        optionNames.push(cleanName);
      }
    });

    // 괄호 포함 옵션 문구 (옵션 없으면 빈 문자열)
    const optionsText = optionNames.length > 0 ? `(${optionNames.join(', ')}) ` : '';

    // 수량 및 요청사항
    const quantity = parseInt(orderQuantityInput.value, 10) || 1;
    const requests = orderRequestsInput.value.trim();

    // 최종 결제 금액 계산
    const total = calculateTotal();

    // 주문 시간 형식화 (예: 13:25)
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const orderTimeStr = `${hours}:${minutes}`;

    // [두 번 클릭 방지] 저장하는 동안 주문하기 버튼 비활성화
    submitBtn.disabled = true;
    const originalBtnText = submitBtn.textContent;
    submitBtn.textContent = '주문 처리 중...';

    try {
      // Supabase 클라이언트 초기화 확인
      if (!supabaseClient) {
        throw new Error('Supabase 클라이언트가 초기화되지 않았습니다. script.js 상단의 URL과 KEY를 설정해주세요.');
      }

      // Supabase의 'dang' 테이블에 주문 데이터 저장
      const { data, error } = await supabaseClient
        .from('dang')
        .insert([
          {
            customer_name: customerName,
            phone: customerPhone,
            drink: drinkName,
            drink_price: beveragePrice,
            size: sizeName,
            options: optionNames, // 배열 형태 저장
            quantity: quantity,
            request: requests,
            total_price: total
          }
        ])
        .select();

      // 에러 발생 시 catch 블록으로 이동
      if (error) {
        throw error;
      }

      // --- [저장 성공 시 처리] ---
      // 1. 주문 확인 메시지 노출
      const confirmationMessage = `${customerName}님, ${drinkName} ${sizeName}사이즈 ${optionsText}${quantity}잔, 총 ${total.toLocaleString()}원 주문이 접수되었습니다!`;
      orderConfirmation.textContent = confirmationMessage;
      orderConfirmation.hidden = false;
      orderConfirmation.classList.remove('hidden');

      // 2. 로컬 주문 내역에도 추가하여 '주문 내역' 탭에 즉시 반영
      const orderId = (data && data[0] && data[0].id) ? data[0].id : orderCounter++;
      const newOrder = {
        id: orderId,
        name: customerName,
        beverage: drinkName,
        size: sizeName,
        options: optionNames,
        quantity: quantity,
        requests: requests,
        price: total,
        time: orderTimeStr
      };

      orders.unshift(newOrder);
      renderOrders();

      // 3. 메시지 위치로 부드럽게 스크롤
      orderConfirmation.scrollIntoView({ behavior: 'smooth' });

    } catch (error) {
      // --- [저장 실패 시 처리] ---
      alert('주문 저장에 실패했어요');
      console.error('주문 저장 에러:', error);
    } finally {
      // 저장이 끝나면(성공 또는 실패 무관) 버튼을 다시 활성화
      submitBtn.disabled = false;
      submitBtn.textContent = originalBtnText;
    }
  });

  // ------------------------------------------------------------------------
  // 7. 주문 내역 화면 렌더링 함수 (renderOrders)
  //    - 보안을 위해 고객 입력값은 innerHTML 대신 textContent로만 생성합니다.
  // ------------------------------------------------------------------------
  function renderOrders() {
    // 탭 옆 주문 건수 배지 갱신
    orderBadge.textContent = orders.length;

    // 기존 주문 목록 영역 비우기
    orderList.textContent = '';

    // 주문 내역이 없을 때의 처리
    if (orders.length === 0) {
      const emptyMsg = document.createElement('div');
      emptyMsg.className = 'empty-orders';
      emptyMsg.textContent = '아직 주문 내역이 없어요 ☕';
      orderList.appendChild(emptyMsg);

      // 하단 통계 및 삭제 버튼 영역 숨김
      historyFooter.classList.add('hidden');
      return;
    }

    // 주문 내역이 있을 때는 하단 통계 영역 표시
    historyFooter.classList.remove('hidden');

    let totalAmount = 0; // 전체 주문 금액 합계

    // 모든 주문을 순회하며 카드 생성
    orders.forEach(function (order) {
      totalAmount += order.price;

      // 주문 카드 컨테이너 (베이지 카드 + 왼쪽 갈색 바)
      const card = document.createElement('div');
      card.className = 'order-card';

      // 오른쪽 상단 '취소' 버튼
      const cancelBtn = document.createElement('button');
      cancelBtn.type = 'button';
      cancelBtn.className = 'order-cancel-btn';
      cancelBtn.textContent = '취소';
      cancelBtn.addEventListener('click', function () {
        if (confirm('주문을 취소하시겠습니까?')) {
          // 해당 주문 id를 제외한 배열로 갱신하여 삭제
          orders = orders.filter(function (item) {
            return item.id !== order.id;
          });
          renderOrders(); // 삭제 후 화면 다시 그리기
        }
      });

      // 1줄: "#1 홍길동님 · 5,000원"
      const line1 = document.createElement('div');
      line1.className = 'order-card-line1';
      line1.textContent = `#${order.id} ${order.name}님 · ${order.price.toLocaleString()}원`;

      // 2줄: "카페라떼 M사이즈 (샷 추가) 1잔"
      const line2 = document.createElement('div');
      line2.className = 'order-card-line2';
      const optStr = order.options && order.options.length > 0
        ? `(${order.options.join(', ')}) `
        : '';
      line2.textContent = `${order.beverage} ${order.size}사이즈 ${optStr}${order.quantity}잔`;

      // 3줄: 요청사항(있을 때만) · 주문 시간
      const line3 = document.createElement('div');
      line3.className = 'order-card-line3';
      line3.textContent = order.requests
        ? `${order.requests} · ${order.time}`
        : order.time;

      // 카드에 자식 요소 조립 (모두 textContent로 안전하게 들어감)
      card.appendChild(cancelBtn);
      card.appendChild(line1);
      card.appendChild(line2);
      card.appendChild(line3);

      orderList.appendChild(card);
    });

    // 하단 총 주문 금액 및 건수 업데이트: 예) "총 주문 금액: 15,000원 (3건)"
    historyTotalSummary.textContent = `총 주문 금액: ${totalAmount.toLocaleString()}원 (${orders.length}건)`;
  }

  // ------------------------------------------------------------------------
  // 8. 내역 모두 지우기 버튼 이벤트 처리
  // ------------------------------------------------------------------------
  clearHistoryBtn.addEventListener('click', function () {
    if (confirm('주문 내역을 모두 지우시겠습니까?')) {
      orders = [];
      renderOrders(); // 초기화 후 화면 갱신
    }
  });

  // ------------------------------------------------------------------------
  // 9. 다시 작성 버튼(초기화) 이벤트 처리
  //    - 주문서 내용만 초기화하고, 주문 내역(orders)은 지우지 않습니다.
  // ------------------------------------------------------------------------
  orderForm.addEventListener('reset', function () {
    setTimeout(function () {
      // M 사이즈 기본 선택 및 수량 1로 복구
      const sizeMRadio = document.getElementById('size-m');
      if (sizeMRadio) {
        sizeMRadio.checked = true;
      }
      orderQuantityInput.value = 1;

      // 예상 금액 0원으로 재계산
      calculateTotal();

      // 주문 확인 메시지 숨김 및 초기화
      orderConfirmation.textContent = '';
      orderConfirmation.hidden = true;
      orderConfirmation.classList.add('hidden');
    }, 0);
  });

  // ------------------------------------------------------------------------
  // 10. 초기 화면 설정
  // ------------------------------------------------------------------------
  calculateTotal(); // 초기 예상 금액(0원) 표시
  renderOrders();   // 초기 주문 내역("아직 주문 내역이 없어요 ☕") 및 뱃지(0) 표시
});
