export interface GitHubRepoData {
  repoName: string;
  description: string;
  stars: number;
  forks: number;
  language: string;
  issues: number;
  readme: string;
  topics: string[];
  license: string;
  updatedAt: string;
}

export class GitHubExtractor {
  extract(): GitHubRepoData | null {
    const repoName = this.extractRepoName();
    if (!repoName) return null;

    return {
      repoName,
      description: this.extractDescription(),
      stars: this.extractStars(),
      forks: this.extractForks(),
      language: this.extractLanguage(),
      issues: this.extractIssues(),
      readme: this.extractReadme(),
      topics: this.extractTopics(),
      license: this.extractLicense(),
      updatedAt: this.extractUpdatedAt(),
    };
  }

  private extractRepoName(): string {
    const meta = document.querySelector('meta[property="og:title"]');
    if (meta) {
      const content = meta.getAttribute('content') || '';
      const match = content.match(/^[^/]+\/([^/]+)/);
      if (match) return content;
    }

    const pathParts = window.location.pathname.split('/').filter(Boolean);
    if (pathParts.length >= 2) {
      return `${pathParts[0]}/${pathParts[1]}`;
    }
    return '';
  }

  private extractDescription(): string {
    const el = document.querySelector('[data-testid="about-description"]')
      || document.querySelector('.f4.my-3');
    return el?.textContent?.trim() || '';
  }

  private extractStars(): number {
    const el = document.querySelector('#repo-stars-counter-star');
    if (el) {
      return this.parseCount(el.textContent?.trim() || '0');
    }
    const starLinks = document.querySelectorAll('a[href$="/stargazers"]');
    for (const link of starLinks) {
      const countEl = link.querySelector('.Counter');
      if (countEl) {
        return this.parseCount(countEl.textContent?.trim() || '0');
      }
    }
    return 0;
  }

  private extractForks(): number {
    const el = document.querySelector('#repo-network-counter');
    if (el) {
      return this.parseCount(el.textContent?.trim() || '0');
    }
    const forkLinks = document.querySelectorAll('a[href$="/forks"]');
    for (const link of forkLinks) {
      const countEl = link.querySelector('.Counter');
      if (countEl) {
        return this.parseCount(countEl.textContent?.trim() || '0');
      }
    }
    return 0;
  }

  private extractLanguage(): string {
    const el = document.querySelector('[data-ga-click*="language"]')
      || document.querySelector('.BorderGrid-row .Progress + ul li:first-child');
    if (el) {
      const colorSpan = el.querySelector('span[itemprop="name"]');
      return colorSpan?.textContent?.trim() || '';
    }
    const langItems = document.querySelectorAll('.repository-lang-stats li');
    if (langItems.length > 0) {
      return langItems[0].querySelector('[itemprop="name"]')?.textContent?.trim() || '';
    }
    return '';
  }

  private extractIssues(): number {
    const el = document.querySelector('#issues-repo-tab-count');
    if (el) {
      return this.parseCount(el.textContent?.trim() || '0');
    }
    const issueLinks = document.querySelectorAll('a[href$="/issues"]');
    for (const link of issueLinks) {
      const countEl = link.querySelector('.Counter');
      if (countEl) {
        return this.parseCount(countEl.textContent?.trim() || '0');
      }
    }
    return 0;
  }

  private extractReadme(): string {
    const readmeEl = document.querySelector('#readme article')
      || document.querySelector('[data-testid="readme"]')
      || document.querySelector('.markdown-body');
    return readmeEl?.textContent?.trim() || '';
  }

  private extractTopics(): string[] {
    const topicEls = document.querySelectorAll('[data-octo-click="topic_click"]');
    return Array.from(topicEls).map((el) => el.textContent?.trim() || '').filter(Boolean);
  }

  private extractLicense(): string {
    const el = document.querySelector('[data-testid="license-link"]')
      || document.querySelector('.BorderGrid-cell a[href*="license"]');
    return el?.textContent?.trim() || '';
  }

  private extractUpdatedAt(): string {
    const el = document.querySelector('[data-testid="last-update-date"]');
    return el?.getAttribute('datetime') || '';
  }

  private parseCount(text: string): number {
    text = text.replace(/,/g, '');
    if (text.endsWith('k')) {
      return Math.floor(parseFloat(text) * 1000);
    }
    if (text.endsWith('M')) {
      return Math.floor(parseFloat(text) * 1000000);
    }
    return parseInt(text, 10) || 0;
  }
}