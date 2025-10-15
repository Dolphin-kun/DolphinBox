import WatchClient from "./WatchClient";

type Params = Promise<{roomId: string}>;

export default async function WatchPage(props: { params: Params }) {
  const { roomId } = await props.params;

  return <WatchClient roomId={roomId} />;
}