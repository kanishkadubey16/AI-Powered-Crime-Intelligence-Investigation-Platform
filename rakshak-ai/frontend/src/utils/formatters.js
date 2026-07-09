import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

dayjs.extend(relativeTime);

export const formatDate = (date) => dayjs(date).format("DD MMM YYYY");
export const formatDateTime = (date) => dayjs(date).format("DD MMM YYYY, HH:mm");
export const timeAgo = (date) => dayjs(date).fromNow();

export const capitalize = (str) =>
  str ? str.charAt(0).toUpperCase() + str.slice(1).replace(/_/g, " ") : "";

export const truncate = (str, length = 60) =>
  str && str.length > length ? `${str.slice(0, length)}...` : str;
