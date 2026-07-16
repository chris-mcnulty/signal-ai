import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import type {
  MutationFunction,
  QueryFunction,
  QueryKey,
  UseMutationOptions,
  UseMutationResult,
  UseQueryOptions,
  UseQueryResult,
} from "@tanstack/react-query";
import type { AuthorProfile } from "./generated/api.schemas";
import { customFetch } from "./custom-fetch";
import type { ErrorType } from "./custom-fetch";

type AwaitedInput<T> = PromiseLike<T> | T;
type Awaited<O> = O extends AwaitedInput<infer T> ? T : never;
type SecondParameter<T extends (...args: never) => unknown> = Parameters<T>[1];

const withQueryKey = <T extends object, K>(query: T, queryKey: K): T & { queryKey: K } => {
  const result = { queryKey } as T & { queryKey: K };
  for (const key of Object.keys(query)) {
    if (key === "queryKey") continue;
    Object.defineProperty(result, key, {
      enumerable: true,
      configurable: true,
      get: () => (query as Record<string, unknown>)[key],
    });
  }
  return result;
};

export interface CreateAuthorInput {
  name: string;
  slug: string;
  bio?: string;
  avatarUrl?: string;
  twitterHandle?: string;
  linkedInUrl?: string;
  isStaff?: boolean;
}

export interface UpdateAuthorInput {
  name?: string;
  bio?: string | null;
  avatarUrl?: string | null;
  twitterHandle?: string | null;
  linkedInUrl?: string | null;
  isStaff?: boolean;
  isActive?: boolean;
}

export const getListAuthorsQueryKey = () => ["/api/authors"] as const;

export const listAuthors = async (options?: RequestInit): Promise<AuthorProfile[]> => {
  return customFetch<AuthorProfile[]>("/api/authors", {
    ...options,
    method: "GET",
  });
};

export const getListAuthorsQueryOptions = <
  TData = Awaited<ReturnType<typeof listAuthors>>,
  TError = ErrorType<unknown>,
>(options?: {
  query?: UseQueryOptions<Awaited<ReturnType<typeof listAuthors>>, TError, TData>;
  request?: SecondParameter<typeof customFetch>;
}) => {
  const { query: queryOptions, request: requestOptions } = options ?? {};
  const queryKey = queryOptions?.queryKey ?? getListAuthorsQueryKey();
  const queryFn: QueryFunction<Awaited<ReturnType<typeof listAuthors>>> = ({ signal }) =>
    listAuthors({ signal, ...requestOptions });
  return { queryKey, queryFn, ...queryOptions } as UseQueryOptions<
    Awaited<ReturnType<typeof listAuthors>>,
    TError,
    TData
  > & { queryKey: QueryKey };
};

export function useListAuthors<
  TData = Awaited<ReturnType<typeof listAuthors>>,
  TError = ErrorType<unknown>,
>(options?: {
  query?: UseQueryOptions<Awaited<ReturnType<typeof listAuthors>>, TError, TData>;
  request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & { queryKey: QueryKey } {
  const queryOptions = getListAuthorsQueryOptions(options);
  const query = useQuery(queryOptions) as UseQueryResult<TData, TError> & { queryKey: QueryKey };
  return withQueryKey(query, queryOptions.queryKey);
}

export const getGetAuthorQueryKey = (slug: string) => ["/api/authors", slug] as const;

export const getAuthor = async (slug: string, options?: RequestInit): Promise<AuthorProfile> => {
  return customFetch<AuthorProfile>(`/api/authors/${encodeURIComponent(slug)}`, {
    ...options,
    method: "GET",
  });
};

export function useGetAuthor<
  TData = Awaited<ReturnType<typeof getAuthor>>,
  TError = ErrorType<unknown>,
>(
  slug: string,
  options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getAuthor>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
  },
): UseQueryResult<TData, TError> & { queryKey: QueryKey } {
  const { query: queryOptions, request: requestOptions } = options ?? {};
  const queryKey = queryOptions?.queryKey ?? getGetAuthorQueryKey(slug);
  const queryFn: QueryFunction<Awaited<ReturnType<typeof getAuthor>>> = ({ signal }) =>
    getAuthor(slug, { signal, ...requestOptions });
  const resolvedOptions = { queryKey, queryFn, enabled: !!slug, ...queryOptions } as UseQueryOptions<
    Awaited<ReturnType<typeof getAuthor>>,
    TError,
    TData
  > & { queryKey: QueryKey };
  const query = useQuery(resolvedOptions) as UseQueryResult<TData, TError> & { queryKey: QueryKey };
  return withQueryKey(query, resolvedOptions.queryKey);
}

export const createAuthor = async (
  data: CreateAuthorInput,
  options?: RequestInit,
): Promise<AuthorProfile> => {
  return customFetch<AuthorProfile>("/api/authors", {
    ...options,
    method: "POST",
    body: JSON.stringify(data),
  });
};

export function useCreateAuthor<TError = ErrorType<unknown>, TContext = unknown>(options?: {
  mutation?: UseMutationOptions<
    Awaited<ReturnType<typeof createAuthor>>,
    TError,
    CreateAuthorInput,
    TContext
  >;
  request?: SecondParameter<typeof customFetch>;
}): UseMutationResult<Awaited<ReturnType<typeof createAuthor>>, TError, CreateAuthorInput, TContext> {
  const { mutation: mutationOptions, request: requestOptions } = options ?? {};
  const mutationFn: MutationFunction<Awaited<ReturnType<typeof createAuthor>>, CreateAuthorInput> = (
    data,
  ) => createAuthor(data, requestOptions);
  return useMutation<Awaited<ReturnType<typeof createAuthor>>, TError, CreateAuthorInput, TContext>({
    mutationFn,
    ...mutationOptions,
  });
}

export const updateAuthor = async (
  id: number,
  data: UpdateAuthorInput,
  options?: RequestInit,
): Promise<AuthorProfile> => {
  return customFetch<AuthorProfile>(`/api/authors/${id}`, {
    ...options,
    method: "PATCH",
    body: JSON.stringify(data),
  });
};

export function useUpdateAuthor<TError = ErrorType<unknown>, TContext = unknown>(options?: {
  mutation?: UseMutationOptions<
    Awaited<ReturnType<typeof updateAuthor>>,
    TError,
    { id: number; data: UpdateAuthorInput },
    TContext
  >;
  request?: SecondParameter<typeof customFetch>;
}): UseMutationResult<
  Awaited<ReturnType<typeof updateAuthor>>,
  TError,
  { id: number; data: UpdateAuthorInput },
  TContext
> {
  const { mutation: mutationOptions, request: requestOptions } = options ?? {};
  const mutationFn: MutationFunction<
    Awaited<ReturnType<typeof updateAuthor>>,
    { id: number; data: UpdateAuthorInput }
  > = ({ id, data }) => updateAuthor(id, data, requestOptions);
  return useMutation<
    Awaited<ReturnType<typeof updateAuthor>>,
    TError,
    { id: number; data: UpdateAuthorInput },
    TContext
  >({
    mutationFn,
    ...mutationOptions,
  });
}

export interface AuthorArticleSummary {
  id: number;
  slug: string;
  title: string;
  dek?: string | null;
  excerpt?: string | null;
  category: string;
  publishedAt: string;
  readingMinutes?: number | null;
  heroImageUrl?: string | null;
}

export const getListAuthorArticlesQueryKey = (slug: string) =>
  ["/api/authors", slug, "articles"] as const;

export interface AuthorArticlesPage {
  items: AuthorArticleSummary[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const listAuthorArticles = async (
  slug: string,
  params?: { page?: number; limit?: number },
  options?: RequestInit,
): Promise<AuthorArticlesPage> => {
  const qs = new URLSearchParams();
  if (params?.page) qs.set("page", String(params.page));
  if (params?.limit) qs.set("limit", String(params.limit));
  const query = qs.toString() ? `?${qs.toString()}` : "";
  return customFetch<AuthorArticlesPage>(
    `/api/authors/${encodeURIComponent(slug)}/articles${query}`,
    { ...options, method: "GET" },
  );
};

export function useListAuthorArticles<
  TData = Awaited<ReturnType<typeof listAuthorArticles>>,
  TError = ErrorType<unknown>,
>(
  slug: string,
  options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listAuthorArticles>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
  },
): UseQueryResult<TData, TError> & { queryKey: QueryKey } {
  const { query: queryOptions, request: requestOptions } = options ?? {};
  const queryKey = queryOptions?.queryKey ?? getListAuthorArticlesQueryKey(slug);
  const queryFn: QueryFunction<Awaited<ReturnType<typeof listAuthorArticles>>> = ({ signal }) =>
    listAuthorArticles(slug, undefined, { signal, ...requestOptions });
  const resolvedOptions = {
    queryKey,
    queryFn,
    enabled: !!slug,
    ...queryOptions,
  } as UseQueryOptions<Awaited<ReturnType<typeof listAuthorArticles>>, TError, TData> & {
    queryKey: QueryKey;
  };
  const query = useQuery(resolvedOptions) as UseQueryResult<TData, TError> & { queryKey: QueryKey };
  return withQueryKey(query, resolvedOptions.queryKey);
}

export function useAuthorsQueryClient() {
  const qc = useQueryClient();
  return {
    invalidateAuthors: () => qc.invalidateQueries({ queryKey: getListAuthorsQueryKey() }),
  };
}
