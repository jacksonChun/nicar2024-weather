import axios from 'axios';
import 'dotenv/config';

const apiKey = process.env.DUST_API_KEY;
const botToken = process.env.TELEGRAM_BOT_TOKEN;
const chatId = process.env.TELEGRAM_CHAT_ID;

// 미세먼지 단계 구분
const getGradeText = (value, type) => {
    if (type === 'PM10') {
        if (value <= 30) return '좋음 😊';
        if (value <= 80) return '보통 😐';
        if (value <= 150) return '나쁨 😷';
        return '매우나쁨 💀';
    } else {
        // PM2.5
        if (value <= 15) return '좋음 😊';
        if (value <= 35) return '보통 😐';
        if (value <= 75) return '나쁨 😷';
        return '매우나쁨 💀';
    }
};

// 기준 수치
const PM10_BAD = 81; // 미세먼지 나쁨 기준
const PM25_BAD = 36; // 초미세먼지 나쁨 기준

async function fetchDustData(itemCode) {
    try {
        const url = `http://apis.data.go.kr/B552584/ArpltnStatsSvc/getCtprvnMesureLIst?serviceKey=${apiKey}&returnType=json&numOfRows=1&pageNo=1&itemCode=${itemCode}&dataGubun=HOUR&searchCondition=MONTH`;
        // console.log(`요청 URL: ${url}`);

        const response = await axios.get(url);
        console.log(`${itemCode} API 응답:`, JSON.stringify(response.data, null, 2));

        return response.data.response.body.items;
    } catch (error) {
        console.error(`${itemCode} 데이터 가져오기 오류:`, error.message);
        return [];
    }
}

(async () => {
    try {
        if (!apiKey) {
            console.error('❌ DUST_API_KEY가 설정되지 않았습니다.');
            return;
        }
        console.log('미세먼지 데이터 조회 시작...');

        // PM10과 PM25 데이터 각각 요청
        const pm10Items = await fetchDustData('PM10');
        const pm25Items = await fetchDustData('PM25');

        const pm10BadAreas = [];
        const pm25BadAreas = [];

        // PM10 데이터 처리
        pm10Items.forEach((item) => {
            // dataTime이 있는 경우에만 처리
            if (!item.dataTime) return;

            // 모든 지역 데이터 처리
            Object.entries(item).forEach(([area, value]) => {
                // dataTime, dataGubun, itemCode는 건너뛰기
                if (['dataTime', 'dataGubun', 'itemCode'].includes(area)) return;

                // 지역명 한글 변환
                const areaName =
                    {
                        seoul: '서울',
                        busan: '부산',
                        daegu: '대구',
                        incheon: '인천',
                        gwangju: '광주',
                        daejeon: '대전',
                        ulsan: '울산',
                        sejong: '세종',
                        gyeonggi: '경기',
                        gangwon: '강원',
                        chungbuk: '충북',
                        chungnam: '충남',
                        jeonbuk: '전북',
                        jeonnam: '전남',
                        gyeongbuk: '경북',
                        gyeongnam: '경남',
                        jeju: '제주',
                    }[area] || area;

                const pm10 = Number(value || 0);

                if (isNaN(pm10)) {
                    console.warn(`'${areaName}'의 PM10 값이 숫자가 아닙니다: ${value}`);
                    return;
                }

                const pm10GradeText = getGradeText(pm10, 'PM10');

                if (pm10 >= PM10_BAD) {
                    pm10BadAreas.push(`• ${areaName}: ${pm10} (${pm10GradeText})`);
                }
            });
        });

        // PM25 데이터 처리
        pm25Items.forEach((item) => {
            // dataTime이 있는 경우에만 처리
            if (!item.dataTime) return;

            // 모든 지역 데이터 처리
            Object.entries(item).forEach(([area, value]) => {
                // dataTime, dataGubun, itemCode는 건너뛰기
                if (['dataTime', 'dataGubun', 'itemCode'].includes(area)) return;

                // 지역명 한글 변환
                const areaName =
                    {
                        seoul: '서울',
                        busan: '부산',
                        daegu: '대구',
                        incheon: '인천',
                        gwangju: '광주',
                        daejeon: '대전',
                        ulsan: '울산',
                        sejong: '세종',
                        gyeonggi: '경기',
                        gangwon: '강원',
                        chungbuk: '충북',
                        chungnam: '충남',
                        jeonbuk: '전북',
                        jeonnam: '전남',
                        gyeongbuk: '경북',
                        gyeongnam: '경남',
                        jeju: '제주',
                    }[area] || area;

                const pm25 = Number(value || 0);

                if (isNaN(pm25)) {
                    console.warn(`'${areaName}'의 PM2.5 값이 숫자가 아닙니다: ${value}`);
                    return;
                }

                const pm25GradeText = getGradeText(pm25, 'PM25');

                if (pm25 >= PM25_BAD) {
                    pm25BadAreas.push(`• ${areaName}: ${pm25} (${pm25GradeText})`);
                }
            });
        });

        function escapeMarkdownV2(text) {
            return text.replace(/([_*\[\]()~`>#+\-=|{}.!\\])/g, '\\$1');
        }
        
        // 메시지 생성
        let message = '';
        
        if (pm10Items.length > 0) {
            const dataTime = escapeMarkdownV2(pm10Items[0].dataTime);
            message += `${dataTime}\n*측정*\n\n`;
        }
        
        if (pm10BadAreas.length) {
            message += `*미세먼지 PM10 \\(단위 ㎍\\/㎥\\):*\n${pm10BadAreas.map(escapeMarkdownV2).join('\n')}\n\n`;
        }
        
        if (pm25BadAreas.length) {
            message += `*초미세먼지 PM2\\.5 \\(단위 ㎍\\/㎥\\):*\n${pm25BadAreas.map(escapeMarkdownV2).join('\n')}\n\n`;
        }
        
        if (pm10BadAreas.length >= 1 || pm25BadAreas.length >= 1) {
            await axios.post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
                chat_id: chatId,
                text: message,
                parse_mode: 'MarkdownV2',
            });
        }
    } catch (error) {
        console.error('❌ 오류:', error.message);
        if (error.response) {
            console.error('API 응답:', JSON.stringify(error.response.data, null, 2));
        }
    }
})();
