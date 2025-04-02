import axios from 'axios';
import 'dotenv/config';

const apiKey = decodeURIComponent(process.env.DUST_API_KEY);
const botToken = process.env.TELEGRAM_BOT_TOKEN;
const chatId = process.env.TELEGRAM_CHAT_ID;

// 경보 단계 구분
const getGradeText = (grade) => {
    return (
        {
            주의보: '주의보 ⚠️',
            경보: '경보 🚨',
            해제: '해제 ✅',
        }[grade] || '정보 없음 ❓'
    );
};

(async () => {
    try {
        // API 요청 URL 수정
        const url = `http://apis.data.go.kr/B552584/UlfptcaAlarmInqireSvc/getUlfptcaAlarmInfo?serviceKey=${apiKey}&returnType=json&numOfRows=100&pageNo=1&year=2024&ver=1.1`;

        // API 요청 헤더 추가
        const response = await axios.get(url, {
            headers: {
                Accept: 'application/json',
            },
        });

        // API 응답 구조 확인
        console.log('API 응답:', JSON.stringify(response.data, null, 2));

        const items = response.data.response?.body?.items;

        if (!items || items.length === 0) {
            console.log('✅ 현재 발령된 주의보/경보가 없습니다.');
            return;
        }

        const alertAreas = new Map(); // 지역별 최신 경보 상태 저장

        items.forEach((item) => {
            // 각 아이템의 구조 확인
            console.log('아이템:', JSON.stringify(item, null, 2));

            const area = item.sidoName;
            const issueTime = item.issueTime;
            const issueGrade = item.issueGbn;
            const dustType = item.itemCode === 'PM25' ? '초미세먼지' : '미세먼지';

            alertAreas.set(`${area}-${dustType}`, `• ${area}: ${dustType} ${getGradeText(issueGrade)} (${issueTime})`);
        });

        // 메시지 생성
        let message = '*⚠️ 미세먼지 주의보/경보 현황 ⚠️*\n\n';
        message += Array.from(alertAreas.values()).join('\n');

        // 메시지 전송
        if (alertAreas.size > 0) {
            await axios.post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
                chat_id: chatId,
                text: message,
                parse_mode: 'Markdown',
            });
            console.log('✅ 텔레그램 전송 완료');
        }
    } catch (error) {
        console.error('❌ 오류:', error.message);
        if (error.response) {
            console.error('API 응답:', error.response.data);
        }
    }
})();
