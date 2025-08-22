/**
 * @cursor-change: 2025-01-27, v1.0.0, 계정 도메인 모델 생성
 * 
 * 계정 도메인 모델
 * - CHARACTERS API siblings 데이터를 기반으로 한 계정 정보
 * - 계정 단위 캐릭터 관리 및 서버 분포 추적
 */

import { ServerName, ClassName } from '../V9/base.js';

// === 계정 식별자 ===

/**
 * 계정 식별자 생성 함수
 */
export function generateAccountId(characterName: string, serverName: ServerName): string {
  // 계정 식별을 위한 해시 생성
  const data = `${characterName}:${serverName}`;
  return `account:${Buffer.from(data).toString('base64').replace(/[^a-zA-Z0-9]/g, '')}`;
}

// === 계정 정보 ===

/**
 * 캐릭터 기본 정보
 */
export interface CharacterInfo {
  characterName: string;
  serverName: ServerName;
  characterLevel: number;
  characterClassName: ClassName;
  itemLevel: number; // ItemAvgLevel을 숫자로 변환
  lastSeen: Date;
  isActive: boolean; // 삭제된 캐릭터는 false
  lastItemLevelUpdate: Date;
}

/**
 * 서버별 캐릭터 분포
 */
export interface ServerDistribution {
  serverName: ServerName;
  characterCount: number;
  averageItemLevel: number;
  lastActivity: Date;
}

/**
 * 계정 정보
 */
export interface AccountInfo {
  accountId: string;
  characters: CharacterInfo[];
  serverDistribution: ServerDistribution[];
  totalCharacters: number;
  averageItemLevel: number;
  lastUpdated: Date;
  createdAt: Date;
  mostActiveServer: ServerName;
}

// === 변화 감지 ===

/**
 * 아이템 레벨 변화 정보
 */
export interface ItemLevelChange {
  characterName: string;
  serverName: ServerName;
  oldLevel: number;
  newLevel: number;
  levelDiff: number;
  detectedAt: Date;
  reason: 'level_up' | 'new_character' | 'manual_update';
}

/**
 * 캐릭터 변화 감지 결과
 */
export interface CharacterChangeDetection {
  changes: ItemLevelChange[];
  newCharacters: CharacterInfo[];
  deletedCharacters: CharacterInfo[];
  accountId: string;
  detectedAt: Date;
}

// === 캐시 메타데이터 ===

/**
 * 계정 정보 캐시 메타데이터
 */
export interface AccountCacheMetadata {
  contentHash: string;
  lastFetched: Date;
  ttl: number; // 초 단위
  version: string;
}

// === 유틸리티 함수 ===

/**
 * ItemAvgLevel 문자열을 숫자로 변환
 */
export function parseItemLevel(itemLevelStr: string): number {
  return parseFloat(itemLevelStr.replace(/,/g, ''));
}

/**
 * 서버 분포 계산
 */
export function calculateServerDistribution(characters: CharacterInfo[]): ServerDistribution[] {
  const serverMap = new Map<ServerName, { count: number; totalLevel: number; lastActivity: Date }>();
  
  for (const char of characters) {
    if (!char.isActive) continue;
    
    const existing = serverMap.get(char.serverName);
    if (existing) {
      existing.count++;
      existing.totalLevel += char.itemLevel;
      existing.lastActivity = char.lastSeen > existing.lastActivity ? char.lastSeen : existing.lastActivity;
    } else {
      serverMap.set(char.serverName, {
        count: 1,
        totalLevel: char.itemLevel,
        lastActivity: char.lastSeen,
      });
    }
  }
  
  return Array.from(serverMap.entries()).map(([serverName, data]) => ({
    serverName,
    characterCount: data.count,
    averageItemLevel: data.totalLevel / data.count,
    lastActivity: data.lastActivity,
  }));
}

/**
 * 가장 활발한 서버 찾기
 */
export function findMostActiveServer(distribution: ServerDistribution[]): ServerName {
  if (distribution.length === 0) throw new Error('No server distribution data');
  
  return distribution.reduce((mostActive, current) => 
    current.lastActivity > mostActive.lastActivity ? current : mostActive
  ).serverName;
}
