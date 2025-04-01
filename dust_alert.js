import axios from 'axios';
import 'dotenv/config';

const apiKey = process.env.DUST_API_KEY;
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
        const url = `http://apis.data.go.kr/B552584/UlfptcaAlarmInqireSvc/getUlfptcaAlarmInfo?serviceKey=${apiKey}&returnType=json&numOfRows=100&pageNo=1&year=2024&ver=1.1`;
        const { data } = await axios.get(url);
        const items = data.response.body.items;

        if (!items || items.length === 0) {
            console.log('✅ 현재 발령된 주의보/경보가 없습니다.');
            return;
        }

        const alertAreas = new Map(); // 지역별 최신 경보 상태 저장

        items.forEach((item) => {
            const area = item.sidoName;
            const issueTime = item.issueTime;
            const issueGrade = item.issueGbn;
            const dustType = item.itemCode === 'PM25' ? '초미세먼지' : '미세먼지';

            alertAreas.set(`${area}-${dustType}`, `• ${area}: ${dustType} ${getGradeText(issueGrade)} (${issueTime})`);
        });

        // 메시지 생성
        let message = '';
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
    }
})();
