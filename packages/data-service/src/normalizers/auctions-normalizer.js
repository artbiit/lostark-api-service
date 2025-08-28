/**
 * @cursor-change: 2025-01-27, v1.0.0, AUCTIONS API 정규화 모듈 구현
 *
 * Lost Ark API V9.0.0 AUCTIONS API 데이터 정규화
 * - 경매장 검색 옵션 정규화
 * - 경매장 아이템 검색 결과 정규화
 */
/**
 * AUCTIONS API 정규화 클래스
 */
export class AuctionsNormalizer {
    /**
     * 경매장 검색 옵션 정규화
     */
    static normalizeOptions(data) {
        return {
            maxItemLevel: data.MaxItemLevel,
            itemGradeQualities: data.ItemGradeQualities,
            skillOptions: data.SkillOptions.map(this.normalizeSkillOption),
            normalizedAt: new Date().toISOString(),
        };
    }
    /**
     * 스킬 옵션 정규화
     */
    static normalizeSkillOption(option) {
        return {
            value: option.Value,
            class: option.Class,
            text: option.Text,
            isSkillGroup: option.IsSkillGroup,
            tripods: option.Tripods.map(this.normalizeTripodOption),
        };
    }
    /**
     * 트라이포드 옵션 정규화
     */
    static normalizeTripodOption(option) {
        return {
            value: option.Value,
            text: option.Text,
            isGem: option.IsGem,
            tiers: option.Tiers,
        };
    }
    /**
     * 경매장 검색 결과 정규화
     */
    static normalizeSearchResult(data) {
        return {
            items: data.Items.map(this.normalizeAuctionItem),
            totalCount: data.TotalCount,
            pageNo: data.PageNo,
            pageSize: data.PageSize,
            normalizedAt: new Date().toISOString(),
        };
    }
    /**
     * 경매장 아이템 정규화
     */
    static normalizeAuctionItem(item) {
        return {
            id: item.Id || 0,
            name: item.Name,
            icon: item.Icon,
            grade: item.Grade,
            tier: item.Tier || 0,
            level: item.Level || 0,
            auctionInfo: {
                startPrice: item.AuctionInfo.StartPrice,
                buyPrice: item.AuctionInfo.BuyPrice,
                bidPrice: item.AuctionInfo.BidPrice,
                endDate: item.AuctionInfo.EndDate,
                bidCount: item.AuctionInfo.BidCount,
                bidStartPrice: item.AuctionInfo.BidStartPrice,
                isCompetitive: item.AuctionInfo.IsCompetitive,
                tradeAllowCount: item.AuctionInfo.TradeAllowCount,
            },
            options: item.Options.map((option) => ({
                type: option.Type,
                optionName: option.OptionName,
                optionNameTripod: option.OptionNameTripod || '',
                value: option.Value,
                isPenalty: option.IsPenalty,
                className: option.ClassName || '',
            })),
            normalizedAt: new Date().toISOString(),
        };
    }
    /**
     * 경매장 아이템 배열 정규화
     */
    static normalizeAuctionItems(items) {
        return items.map(this.normalizeAuctionItem);
    }
}
