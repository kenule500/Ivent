import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { toast } from "sonner";
import type { FunctionReference, FunctionArgs } from "convex/server";

// 2. Make the hook generic using <Query extends ...>
export function useConvexQuery<Query extends FunctionReference<"query", "public">>(
  query: Query,
  // 3. Use FunctionArgs<Query> to extract the exact arguments for that specific query
  args?: FunctionArgs<Query> | "skip"
) {
  const result = useQuery(query, args);

  const isLoading = result === undefined;
  
  // Convex queries throw errors directly into the React tree,  
  // they don't return them as values. So error is always null here.
  const error = null; 

  return { data: result, isLoading, error };
}


// ========== useConvexMutation ==========
export const useConvexMutation = <
  TMutation extends FunctionReference<"mutation">,
  TData = TMutation["_returnType"] // inferred return type
>(
  mutation: TMutation
) => {
  const mutationFn = useMutation(mutation);
  const [data, setData] = useState<TData | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const mutate = async (
    ...args: TMutation["_args"] extends undefined ? [] : [TMutation["_args"]]
  ) => {
    setIsLoading(true);
    setError(null);

    try {
      // The mutation function expects either no args or a single args object
      const response = await mutationFn(args[0] as TMutation["_args"]);
      setData(response as TData);
      return response;
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error(String(err));
      setError(errorObj);
      toast.error(errorObj.message);
      throw err; // re-throw for the caller to handle if needed
    } finally {
      setIsLoading(false);
    }
  };

  return { mutate, data, isLoading, error };
};