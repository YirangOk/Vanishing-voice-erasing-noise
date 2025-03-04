$(document).ready(function() {
    // .script-content 내부의 모든 div 요소(각 캡션)를 선택합니다.
    var captions = $("#script .script-content > div");
    var currentIndex = 0;
    
    // 초기 상태: 모든 캡션 숨기고 첫 캡션만 보이도록 설정
    captions.hide();
    $(captions[0]).show();
    
    // Next 버튼 클릭 시
    $("#next").click(function() {
      if (currentIndex < captions.length - 1) {
        $(captions[currentIndex]).hide();
        currentIndex++;
        $(captions[currentIndex]).show();
      }
    });
    
    // Before 버튼 클릭 시
    $("#before").click(function() {
      if (currentIndex > 0) {
        $(captions[currentIndex]).hide();
        currentIndex--;
        $(captions[currentIndex]).show();
      }
    });

  });
  
  document.addEventListener("keydown", function(event) {
    if (event.key === "Enter") { // Enter 키를 눌렀을 때 실행
        var infoElements = document.querySelectorAll(".personal-info > div");
        infoElements.forEach(element => element.style.display = "none");

        infoElements.forEach((element, index) => {
            setTimeout(() => {
                element.style.display = "block";
                blinkEffect(element, () => fadeIn(element));
            }, 10000 * (index + 1));
        });

        function blinkEffect(element, callback) {
            let count = 0;
            let interval = setInterval(() => {
                element.style.visibility = (element.style.visibility === "hidden") ? "visible" : "hidden";
                count++;
                if (count >= 10) { // 점점 빠르게 깜빡임
                    clearInterval(interval);
                    element.style.visibility = "visible";
                    callback();
                }
            }, 200 - count * 15); // 깜빡이는 속도가 점점 빨라짐
        }

        function fadeIn(element) {
            let opacity = 0;
            let interval = setInterval(() => {
                if (opacity >= 1) {
                    clearInterval(interval);
                } else {
                    opacity += 0.05;
                    element.style.opacity = opacity;
                }
            }, 50);
        }
    }
});
