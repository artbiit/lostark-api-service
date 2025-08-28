/**
 * @cursor-change: 2025-01-27, v1.0.0, NEWS API 정규화 모듈 구현
 *
 * Lost Ark API V9.0.0 NEWS API 데이터 정규화
 * - 공지사항 정규화
 * - 이벤트 정규화
 */
/**
 * NEWS API 정규화 클래스
 */
export class NewsNormalizer {
    /**
     * 공지사항 정규화
     */
    static normalizeNotice(notice) {
        return {
            title: notice.Title,
            date: notice.Date,
            link: notice.Link,
            type: notice.Type,
            normalizedAt: new Date().toISOString(),
        };
    }
    /**
     * 이벤트 보상 아이템 정규화
     */
    static normalizeEventRewardItem(item) {
        return {
            name: item.Name,
            icon: item.Icon,
            grade: item.Grade,
            startTimes: item.StartTimes || null,
        };
    }
    /**
     * 이벤트 정규화
     */
    static normalizeEvent(event) {
        const now = new Date();
        const startDate = new Date(event.StartDate);
        const endDate = new Date(event.EndDate);
        const isActive = startDate <= now && now <= endDate;
        return {
            title: event.Title,
            thumbnail: event.Thumbnail,
            link: event.Link,
            startDate: event.StartDate,
            endDate: event.EndDate,
            rewardDate: event.RewardDate || null,
            rewardItems: (event.RewardItems?.map(this.normalizeEventRewardItem) ||
                []),
            isActive,
            normalizedAt: new Date().toISOString(),
        };
    }
    /**
     * 공지사항 목록 정규화
     */
    static normalizeNotices(notices) {
        return {
            notices: notices.map(this.normalizeNotice),
            totalCount: notices.length,
            normalizedAt: new Date().toISOString(),
        };
    }
    /**
     * 이벤트 목록 정규화
     */
    static normalizeEvents(events) {
        const normalizedEvents = events.map(this.normalizeEvent);
        const activeCount = normalizedEvents.filter((event) => event.isActive).length;
        return {
            events: normalizedEvents,
            totalCount: events.length,
            activeCount,
            normalizedAt: new Date().toISOString(),
        };
    }
    /**
     * 공지사항 배열 정규화
     */
    static normalizeNoticesArray(notices) {
        return notices.map(this.normalizeNotice);
    }
    /**
     * 이벤트 배열 정규화
     */
    static normalizeEventsArray(events) {
        return events.map(this.normalizeEvent);
    }
}
