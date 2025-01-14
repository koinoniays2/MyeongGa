(function () {
    // 폼 데이터를 가져와 객체로 반환하는 함수
    function getFormData(form) {
        var elements = form.elements; // 폼 내의 모든 요소
        var honeypot; // 봇을 잡기 위한 숨겨진 필드

        // 폼 필드 추출 및 처리
        var fields = Object.keys(elements).filter(function (k) {
            if (elements[k].name === "honeypot") {
                honeypot = elements[k].value; // 숨겨진 필드 값 저장
                return false; // 제외
            }
            return true;
        }).map(function (k) {
            if (elements[k].name !== undefined) {
                return elements[k].name; // 필드 이름 반환
            } else if (elements[k].length > 0) {
                return elements[k].item(0).name; // Edge 호환성 처리
            }
        }).filter(function (item, pos, self) {
            return self.indexOf(item) == pos && item; // 중복 제거
        });

        var formData = {};
        fields.forEach(function (name) {
            var element = elements[name];

            // 단일 값인 경우 처리
            formData[name] = element.value;

            // 여러 값인 경우 배열로 처리
            if (element.length) {
                var data = [];
                for (var i = 0; i < element.length; i++) {
                    var item = element.item(i);
                    if (item.checked || item.selected) {
                        data.push(item.value);
                    }
                }
                formData[name] = data.join(', ');
            }
        });

        // 추가 메타데이터 설정
        formData.formDataNameOrder = JSON.stringify(fields); // 필드 순서 저장
        formData.formGoogleSheetName = form.dataset.sheet || "responses"; // 구글 시트 이름 (기본값 responses)
        formData.formGoogleSendEmail = form.dataset.email || ""; // 이메일 기본값 비어 있음

        return { data: formData, honeypot: honeypot };
    }

    // 폼 제출 처리 함수
    function handleFormSubmit(event) {
        event.preventDefault(); // 기본 폼 제출 동작 방지
        var form = event.target; // 제출된 폼
        var formData = getFormData(form);
        var data = formData.data;

        // 봇에 의해 숨겨진 필드가 채워진 경우 처리 중단
        if (formData.honeypot) {
            return false;
        }

        // 버튼 비활성화 및 스피너 표시
        disableAllButtons(form, true);

        var url = form.action; // 폼의 action 속성 (제출 URL)
        var xhr = new XMLHttpRequest();
        xhr.open('POST', url);
        xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");

        xhr.onreadystatechange = function () {
            var messageBox = form.querySelector(".submit-message");
            if (xhr.readyState === 4) {
                // 요청 완료 시 버튼 복원 및 스피너 숨기기
                disableAllButtons(form, false);

                if (xhr.status === 200) {
                    form.reset(); // 폼 초기화
                    messageBox.textContent = "제출 완료되었습니다. 순차적으로 연락드리겠습니다.";
                    messageBox.style.color = "#40AECB";
                } else {
                    messageBox.textContent = "제출 중 오류가 발생했습니다. 다시 시도해주세요.";
                    messageBox.style.color = "red";
                }
            }
        };

        // 데이터를 URL 인코딩하여 전송
        var encoded = Object.keys(data).map(function (k) {
            return encodeURIComponent(k) + "=" + encodeURIComponent(data[k]);
        }).join('&');

        xhr.send(encoded); // 요청 전송
    }

    // 페이지 로드 시 폼 이벤트 바인딩
    function loaded() {
        var forms = document.querySelectorAll("form.gform"); // gform 클래스를 가진 모든 폼 선택
        for (var i = 0; i < forms.length; i++) {
            forms[i].addEventListener("submit", handleFormSubmit, false); // 제출 이벤트 처리 함수 연결
        }
    }

    document.addEventListener("DOMContentLoaded", loaded, false); // DOM 로드 완료 후 실행

    // 버튼 비활성화 및 스피너 제어 함수
    function disableAllButtons(form, disable) {
        var buttons = form.querySelectorAll("button"); // 모든 버튼 선택
        for (var i = 0; i < buttons.length; i++) {
            buttons[i].disabled = disable; // 버튼 활성화/비활성화
            if (disable) {
                buttons[i].innerHTML = '<span class="spinner"></span>'; // 스피너 추가 및 텍스트 변경
            } else {
                buttons[i].innerHTML = '제출'; // 원래 텍스트로 복원
            }
        }
    }
})();

// CSS로 스피너 스타일 정의
const style = document.createElement('style');
style.innerHTML = `
.spinner {
    display: inline-block;
    width: 12px;
    height: 12px;
    border: 2px solid rgba(255, 255, 255, 0.5);
    border-top: 2px solid #fff;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    vertical-align: middle;
}
@keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
}`;
document.head.appendChild(style);