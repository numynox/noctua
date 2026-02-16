export interface Article {
  id: string;
  feed_id: string;
  feed_name: string;
  title: string;
  url: string;
  published: string | null;
  updated: string | null;
  author: string | null;
  summary: string | null;
  image_url: string | null;
  tags: string[];
}

export interface Feed {
  id: string;
  name: string;
  url: string;
}

export interface Section {
  id: string;
  name: string;
  icon: string;
  feeds: Feed[];
}

export interface UserContent {
  isLoggedIn: boolean;
  sections: Section[];
  articles: Article[];
  selectedSectionId: string | null;
}
