/**
 * @cursor-change: 2025-01-27, v1.0.0, CHARACTERS API ETL 모듈 생성
 *
 * CHARACTERS API ETL 모듈
 * - siblings 데이터를 계정 정보로 변환
 * - 변화 감지 및 ARMORIES 큐 연동
 * - 캐시 관리
 */
import { logger } from '@lostark/shared';
import { calculateServerDistribution, findMostActiveServer, generateAccountId, parseItemLevel, } from '@lostark/shared/types/domain';
// === ETL 모듈 ===
/**
 * CHARACTERS API ETL 모듈
 */
export class CharactersNormalizer {
    defaultTTL = 300; // 5분
    /**
     * siblings 데이터를 계정 정보로 변환
     */
    async normalizeSiblings(characterName, siblingsData) {
        logger.info('Normalizing siblings data', {
            characterName,
            characterCount: siblingsData.length,
            requestId: this.generateRequestId(),
        });
        // 첫 번째 캐릭터를 기준으로 계정 ID 생성
        const firstCharacter = siblingsData[0];
        if (!firstCharacter) {
            throw new Error('No characters found in siblings data');
        }
        const accountId = generateAccountId(firstCharacter.CharacterName, firstCharacter.ServerName);
        // 캐릭터 정보 변환
        const characters = siblingsData.map((sibling) => ({
            characterName: sibling.CharacterName,
            serverName: sibling.ServerName,
            characterLevel: sibling.CharacterLevel,
            characterClassName: sibling.CharacterClassName,
            itemLevel: parseItemLevel(sibling.ItemAvgLevel),
            lastSeen: new Date(),
            isActive: true,
            lastItemLevelUpdate: new Date(),
        }));
        // 서버 분포 계산
        const serverDistribution = calculateServerDistribution(characters);
        const mostActiveServer = findMostActiveServer(serverDistribution);
        // 평균 아이템 레벨 계산
        const totalItemLevel = characters.reduce((sum, char) => sum + char.itemLevel, 0);
        const averageItemLevel = totalItemLevel / characters.length;
        const accountInfo = {
            accountId,
            characters,
            serverDistribution,
            totalCharacters: characters.length,
            averageItemLevel,
            lastUpdated: new Date(),
            createdAt: new Date(),
            mostActiveServer,
        };
        logger.info('Successfully normalized siblings data', {
            accountId,
            characterCount: characters.length,
            serverCount: serverDistribution.length,
            averageItemLevel,
            mostActiveServer,
            requestId: this.generateRequestId(),
        });
        return accountInfo;
    }
    /**
     * 계정 정보 변화 감지
     */
    async detectChanges(currentAccount, newSiblingsData) {
        logger.info('Detecting character changes', {
            accountId: currentAccount.accountId,
            currentCharacterCount: currentAccount.characters.length,
            newCharacterCount: newSiblingsData.length,
            requestId: this.generateRequestId(),
        });
        const changes = [];
        const newCharacters = [];
        const deletedCharacters = [];
        // 새 캐릭터 정보 변환
        const newCharacterMap = new Map();
        for (const sibling of newSiblingsData) {
            const characterInfo = {
                characterName: sibling.CharacterName,
                serverName: sibling.ServerName,
                characterLevel: sibling.CharacterLevel,
                characterClassName: sibling.CharacterClassName,
                itemLevel: parseItemLevel(sibling.ItemAvgLevel),
                lastSeen: new Date(),
                isActive: true,
                lastItemLevelUpdate: new Date(),
            };
            newCharacterMap.set(sibling.CharacterName, characterInfo);
        }
        // 기존 캐릭터와 비교
        for (const existingChar of currentAccount.characters) {
            const newChar = newCharacterMap.get(existingChar.characterName);
            if (!newChar) {
                // 삭제된 캐릭터
                deletedCharacters.push({
                    ...existingChar,
                    isActive: false,
                    lastSeen: new Date(),
                });
            }
            else {
                // 아이템 레벨 변화 감지
                if (newChar.itemLevel > existingChar.itemLevel) {
                    const levelDiff = newChar.itemLevel - existingChar.itemLevel;
                    changes.push({
                        characterName: existingChar.characterName,
                        serverName: existingChar.serverName,
                        oldLevel: existingChar.itemLevel,
                        newLevel: newChar.itemLevel,
                        levelDiff,
                        detectedAt: new Date(),
                        reason: levelDiff > 10 ? 'level_up' : 'manual_update',
                    });
                    logger.info('Detected item level change', {
                        characterName: existingChar.characterName,
                        oldLevel: existingChar.itemLevel,
                        newLevel: newChar.itemLevel,
                        levelDiff,
                        reason: levelDiff > 10 ? 'level_up' : 'manual_update',
                        requestId: this.generateRequestId(),
                    });
                }
            }
        }
        // 새로 생성된 캐릭터 감지
        for (const newChar of newCharacterMap.values()) {
            const existingChar = currentAccount.characters.find((char) => char.characterName === newChar.characterName);
            if (!existingChar) {
                newCharacters.push(newChar);
                changes.push({
                    characterName: newChar.characterName,
                    serverName: newChar.serverName,
                    oldLevel: 0,
                    newLevel: newChar.itemLevel,
                    levelDiff: newChar.itemLevel,
                    detectedAt: new Date(),
                    reason: 'new_character',
                });
                logger.info('Detected new character', {
                    characterName: newChar.characterName,
                    serverName: newChar.serverName,
                    itemLevel: newChar.itemLevel,
                    requestId: this.generateRequestId(),
                });
            }
        }
        const detection = {
            changes,
            newCharacters,
            deletedCharacters,
            accountId: currentAccount.accountId,
            detectedAt: new Date(),
        };
        logger.info('Character change detection completed', {
            accountId: currentAccount.accountId,
            changeCount: changes.length,
            newCharacterCount: newCharacters.length,
            deletedCharacterCount: deletedCharacters.length,
            requestId: this.generateRequestId(),
        });
        return detection;
    }
    /**
     * 계정 정보 업데이트
     */
    async updateAccountInfo(currentAccount, newSiblingsData) {
        logger.info('Updating account info', {
            accountId: currentAccount.accountId,
            requestId: this.generateRequestId(),
        });
        // 새 계정 정보 생성
        const newAccountInfo = await this.normalizeSiblings(currentAccount.characters[0]?.characterName || 'unknown', newSiblingsData);
        // 기존 계정 ID 유지
        newAccountInfo.accountId = currentAccount.accountId;
        newAccountInfo.createdAt = currentAccount.createdAt;
        // 삭제된 캐릭터 처리
        const deletedCharacterNames = currentAccount.characters
            .filter((char) => !newSiblingsData.find((sibling) => sibling.CharacterName === char.characterName))
            .map((char) => char.characterName);
        if (deletedCharacterNames.length > 0) {
            logger.info('Marking characters as inactive', {
                accountId: currentAccount.accountId,
                deletedCharacterNames,
                requestId: this.generateRequestId(),
            });
        }
        logger.info('Account info updated successfully', {
            accountId: currentAccount.accountId,
            newCharacterCount: newAccountInfo.characters.length,
            deletedCharacterCount: deletedCharacterNames.length,
            requestId: this.generateRequestId(),
        });
        return newAccountInfo;
    }
    /**
     * ARMORIES 큐 항목 생성
     */
    generateArmoriesQueueItems(detection) {
        const queueItems = [];
        for (const change of detection.changes) {
            let priority = 1; // 기본 우선순위
            // 레벨업이 크면 우선순위 높임
            if (change.reason === 'level_up' && change.levelDiff > 10) {
                priority = 3;
            }
            else if (change.reason === 'new_character') {
                priority = 2;
            }
            queueItems.push({
                characterName: change.characterName,
                reason: change.reason,
                priority,
            });
        }
        // 새 캐릭터들도 큐에 추가
        for (const newChar of detection.newCharacters) {
            if (!queueItems.find((item) => item.characterName === newChar.characterName)) {
                queueItems.push({
                    characterName: newChar.characterName,
                    reason: 'new_character',
                    priority: 2,
                });
            }
        }
        logger.info('Generated ARMORIES queue items', {
            accountId: detection.accountId,
            queueItemCount: queueItems.length,
            highPriorityCount: queueItems.filter((item) => item.priority >= 3).length,
            requestId: this.generateRequestId(),
        });
        return queueItems;
    }
    /**
     * 요청 ID 생성
     */
    generateRequestId() {
        return `char-etl-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
}
// === 싱글톤 인스턴스 ===
/**
 * CHARACTERS API ETL 모듈 인스턴스
 */
export const charactersNormalizer = new CharactersNormalizer();
