import { useState, useEffect, useCallback } from "react";

const useApi = (apiFn, params = null, immediate = true) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(immediate);
  const [error, setError] = useState(null);

  const execute = useCallback(
    async (...args) => {
      setLoading(true);
      setError(null);
      try {
        const res = await apiFn(...args);
        setData(res.data);
        return res.data;
      } catch (err) {
        setError(err.response?.data?.message || "Something went wrong");
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [apiFn]
  );

  useEffect(() => {
    if (immediate) execute(params);
  }, []);

  return { data, loading, error, execute, setData };
};

export default useApi;
