import { useEffect, useRef, useState, useCallback } from 'react';
import { Network } from 'vis-network/standalone';
import { DataSet } from 'vis-data/standalone';
import type { Device, OnlineUser } from '../types';

const HUB_ID = '__hub__';
const USER_NODE_PREFIX = 'user:';

function userNodeId(userId: string): string {
  return USER_NODE_PREFIX + userId;
}

interface Props {
  devices: Device[];
  onlineUsers: OnlineUser[];
  currentUserId: string | null;
  friendIds?: string[];
  onSelectDevice: (device: Device) => void;
  onSelectUser: (user: OnlineUser) => void;
}

// Friendship edges: others' QBIT–owner, my QBIT–my friends (my-claim edge uses inherit: 'both' gradient)
const EDGE_FRIEND_COLOR = '#f57c00';

export default function NetworkGraph({
  devices,
  onlineUsers,
  currentUserId,
  friendIds = [],
  onSelectDevice,
  onSelectUser,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const networkRef = useRef<Network | null>(null);
  const nodesRef = useRef(new DataSet<Record<string, unknown>>());
  const edgesRef = useRef(new DataSet<Record<string, unknown>>());
  const [labelsVisible, setLabelsVisible] = useState(true);
  const labelsVisibleRef = useRef(true);

  const devicesRef = useRef(devices);
  const onlineUsersRef = useRef(onlineUsers);
  const currentUserIdRef = useRef(currentUserId);
  const friendIdsRef = useRef(friendIds);
  const onSelectDeviceRef = useRef(onSelectDevice);
  const onSelectUserRef = useRef(onSelectUser);
  useEffect(() => {
    devicesRef.current = devices;
  }, [devices]);
  useEffect(() => {
    onlineUsersRef.current = onlineUsers;
  }, [onlineUsers]);
  useEffect(() => {
    currentUserIdRef.current = currentUserId;
  }, [currentUserId]);
  useEffect(() => {
    friendIdsRef.current = friendIds;
  }, [friendIds]);
  useEffect(() => {
    onSelectDeviceRef.current = onSelectDevice;
  }, [onSelectDevice]);
  useEffect(() => {
    onSelectUserRef.current = onSelectUser;
  }, [onSelectUser]);

  // Initialise vis-network once
  useEffect(() => {
    if (!containerRef.current) return;

    // Central hub node (guard against StrictMode double-mount in dev)
    if (!nodesRef.current.get(HUB_ID)) {
      nodesRef.current.add({
        id: HUB_ID,
        label: '',
        shape: 'hexagon',
        size: 45,
        color: {
          border: '#d32f2f',
          background: '#1a1a1a',
          highlight: { border: '#ff4d4d', background: '#222' },
          hover: { border: '#ff4d4d', background: '#222' },
        },
        font: { color: '#fff', size: 16, bold: { color: '#fff' } },
        fixed: true,
        x: 0,
        y: 0,
      });
    }

    networkRef.current = new Network(
      containerRef.current,
      { nodes: nodesRef.current, edges: edgesRef.current },
      {
        nodes: {
          shape: 'dot',
          size: 22,
          font: { color: '#ffffff', size: 13, face: 'Inter, sans-serif', multi: 'html' },
          borderWidth: 2,
          shadow: { enabled: true, size: 6, color: 'rgba(0,0,0,0.3)' },
          color: {
            border: '#d32f2f',
            background: '#242424',
            highlight: { border: '#ff4d4d', background: '#333333' },
            hover: { border: '#ff4d4d', background: '#2c2c2c' },
          },
        },
        edges: {
          width: 1,
          color: { color: '#444', highlight: '#d32f2f', hover: '#666' },
          smooth: false,
        },
        physics: {
          barnesHut: {
            gravitationalConstant: -3000,
            centralGravity: 0.3,
            springLength: 130,
            springConstant: 0.04,
          },
          stabilization: { iterations: 100 },
        },
        interaction: {
          hover: true,
          tooltipDelay: 200,
          selectable: true,
          dragNodes: true,
        },
      }
    );

    // Click handler -- open poke dialog for device nodes or user poke for user nodes (self not clickable)
    networkRef.current.on('click', (params: { nodes: string[] }) => {
      if (params.nodes.length === 0 || params.nodes[0] === HUB_ID) return;
      const id = params.nodes[0];
      if (id.startsWith(USER_NODE_PREFIX)) {
        const publicUserId = id.slice(USER_NODE_PREFIX.length);
        if (publicUserId === currentUserIdRef.current) return;
        const onlineUser = onlineUsersRef.current.find((u) => u.publicUserId === publicUserId);
        if (onlineUser) onSelectUserRef.current(onlineUser);
      } else {
        const device = devicesRef.current.find((d) => d.id === id);
        if (device) onSelectDeviceRef.current(device);
      }
    });

    return () => {
      networkRef.current?.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync devices and online users to vis-network datasets
  useEffect(() => {
    const nodes = nodesRef.current;
    const edges = edgesRef.current;
    const now = Date.now();

    const currentIds = (nodes.getIds() as string[]).filter((id) => id !== HUB_ID);
    const deviceIds = new Set(devices.map((d) => d.id));
    const userIds = new Set(onlineUsers.map((u) => userNodeId(u.publicUserId)));

    // Remove nodes that went offline
    currentIds.forEach((id) => {
      const isDevice = !id.startsWith(USER_NODE_PREFIX);
      const stillPresent = isDevice ? deviceIds.has(id) : userIds.has(id);
      if (!stillPresent) {
        nodes.remove(id);
        const toRemove = edges.get({
          filter: (e: Record<string, unknown>) => e.to === id,
        });
        edges.remove(toRemove.map((e: Record<string, unknown>) => e.id as string));
      }
    });

    const uptimes = devices.map((d) => now - new Date(d.connectedAt).getTime());
    const maxUptime = Math.max(...uptimes, 1);
    const userEdgeLength = 200;

    // Add or update device nodes
    devices.forEach((d) => {
      let label = d.name;
      if (d.claimedBy && d.claimedBy.userName) {
        label += `\n${d.claimedBy.userName}`;
      }
      const nodeConfig: Record<string, unknown> = { id: d.id, label };
      if (d.claimedBy && d.claimedBy.userAvatar) {
        nodeConfig.shape = 'circularImage';
        nodeConfig.image = d.claimedBy.userAvatar;
        nodeConfig.size = 24;
        nodeConfig.borderWidth = 2;
        nodeConfig.color = {
          border: '#d32f2f',
          highlight: { border: '#ff4d4d' },
          hover: { border: '#ff4d4d' },
        };
      } else {
        nodeConfig.shape = 'dot';
        nodeConfig.image = undefined;
        nodeConfig.size = 22;
      }
      const uptime = now - new Date(d.connectedAt).getTime();
      const ratio = uptime / maxUptime;
      const edgeLength = 300 - ratio * 180;
      if (nodes.get(d.id)) {
        nodes.update(nodeConfig);
        edges.update({ id: `edge-${d.id}`, length: edgeLength });
      } else {
        nodes.add(nodeConfig);
        edges.add({ id: `edge-${d.id}`, from: HUB_ID, to: d.id, length: edgeLength });
      }
    });

    // Add or update user nodes (distinct color: blue)
    const userColor = {
      border: '#1976d2',
      background: '#1565c0',
      highlight: { border: '#42a5f5', background: '#1976d2' },
      hover: { border: '#42a5f5', background: '#0d47a1' },
    };
    onlineUsers.forEach((u) => {
      const id = userNodeId(u.publicUserId);
      const nodeConfig: Record<string, unknown> = {
        id,
        label: u.displayName,
        color: userColor,
      };
      if (u.avatar) {
        nodeConfig.shape = 'circularImage';
        nodeConfig.image = u.avatar;
        nodeConfig.size = 24;
        nodeConfig.borderWidth = 2;
        nodeConfig.color = {
          border: '#1976d2',
          highlight: { border: '#42a5f5' },
          hover: { border: '#42a5f5' },
        };
      } else {
        nodeConfig.shape = 'dot';
        nodeConfig.size = 22;
      }
      if (nodes.get(id)) {
        nodes.update(nodeConfig);
        edges.update({ id: `edge-${id}`, length: userEdgeLength });
      } else {
        nodes.add(nodeConfig);
        edges.add({ id: `edge-${id}`, from: HUB_ID, to: id, length: userEdgeLength });
      }
    });

    // Device-to-user edges: claimed device -> owner (gradient blue-to-red if my QBIT, else solid blue); my device -> my friends (blue)
    const d2uEdgeIds = new Set<string>();
    const linkLength = 180;
    devices.forEach((d) => {
      if (!d.claimedBy?.publicUserId) return;
      const ownerNodeId = userNodeId(d.claimedBy.publicUserId);
      if (!userIds.has(ownerNodeId)) return;
      const edgeId = `edge-d2u-${d.id}-${d.claimedBy.publicUserId}`;
      d2uEdgeIds.add(edgeId);
      const isMyClaim = d.claimedBy.publicUserId === currentUserId;
      if (edges.get(edgeId)) {
        if (isMyClaim) {
          edges.update({
            id: edgeId,
            from: ownerNodeId,
            to: d.id,
            color: { inherit: 'both' as const },
            length: linkLength,
          });
        } else {
          edges.update({ id: edgeId, from: d.id, to: ownerNodeId, color: EDGE_FRIEND_COLOR, length: linkLength });
        }
      } else {
        if (isMyClaim) {
          // Edge from user (blue) to device (red) so gradient is blue -> red
          edges.add({
            id: edgeId,
            from: ownerNodeId,
            to: d.id,
            color: { inherit: 'both' as const },
            length: linkLength,
          });
        } else {
          edges.add({ id: edgeId, from: d.id, to: ownerNodeId, color: EDGE_FRIEND_COLOR, length: linkLength });
        }
      }
      // My QBIT -> my friends (blue)
      if (isMyClaim && friendIds.length > 0) {
        friendIds.forEach((friendId) => {
          const friendNodeId = userNodeId(friendId);
          if (!userIds.has(friendNodeId)) return;
          const friendEdgeId = `edge-d2u-${d.id}-friend-${friendId}`;
          d2uEdgeIds.add(friendEdgeId);
          if (edges.get(friendEdgeId)) {
            edges.update({ id: friendEdgeId, color: EDGE_FRIEND_COLOR, length: linkLength });
          } else {
            edges.add({
              id: friendEdgeId,
              from: d.id,
              to: friendNodeId,
              color: EDGE_FRIEND_COLOR,
              length: linkLength,
            });
          }
        });
      }
    });
    // Remove stale d2u edges
    const allEdgeIds = edges.getIds() as string[];
    allEdgeIds.forEach((eid) => {
      if (eid.startsWith('edge-d2u-') && !d2uEdgeIds.has(eid)) {
        edges.remove(eid);
      }
    });
  }, [devices, onlineUsers, currentUserId, friendIds]);

  // Center / fit the view
  const handleFit = useCallback(() => {
    networkRef.current?.fit({ animation: { duration: 400, easingFunction: 'easeInOutQuad' } });
  }, []);

  // Toggle label visibility
  const handleToggleLabels = useCallback(() => {
    const next = !labelsVisibleRef.current;
    labelsVisibleRef.current = next;
    setLabelsVisible(next);
    const nodes = nodesRef.current;
    const allIds = (nodes.getIds() as string[]).filter((id) => id !== HUB_ID);
    allIds.forEach((id) => {
      nodes.update({ id, font: { color: next ? '#ffffff' : 'transparent' } });
    });
  }, []);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <div
        ref={containerRef}
        className="network-graph-container"
        style={{ width: '100%', height: '100%', background: '#0e0e0e' }}
      />
      <div className="network-fab-group">
        <button
          className="network-fab"
          onClick={handleFit}
          title="Center view"
          aria-label="Center view"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M3 12h3m12 0h3M12 3v3m0 12v3" />
          </svg>
        </button>
        <button
          className={`network-fab${labelsVisible ? '' : ' network-fab-off'}`}
          onClick={handleToggleLabels}
          title={labelsVisible ? 'Hide labels' : 'Show labels'}
          aria-label={labelsVisible ? 'Hide labels' : 'Show labels'}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 7V4h16v3" />
            <path d="M9 20h6" />
            <path d="M12 4v16" />
          </svg>
        </button>
      </div>
    </div>
  );
}
