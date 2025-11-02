import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { Card } from './ui/card';

interface Node {
  id: string;
  type: 'web' | 'database' | 'workstation' | 'firewall';
  status: 'clean' | 'compromised' | 'exfiltrated';
  position: [number, number, number];
}

interface Edge {
  from: string;
  to: string;
  active: boolean;
}

interface NetworkTopology3DProps {
  phase: number;
}

const NetworkTopology3D: React.FC<NetworkTopology3DProps> = ({ phase }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const nodesRef = useRef<Map<string, THREE.Mesh>>(new Map());

  const nodes: Node[] = [
    { id: 'firewall', type: 'firewall', status: 'clean', position: [0, 2, 0] },
    { id: 'web1', type: 'web', status: 'clean', position: [-3, 0, 0] },
    { id: 'web2', type: 'web', status: 'clean', position: [3, 0, 0] },
    { id: 'db1', type: 'database', status: 'clean', position: [-3, -2, 2] },
    { id: 'db2', type: 'database', status: 'clean', position: [3, -2, 2] },
    { id: 'ws1', type: 'workstation', status: 'clean', position: [-5, -2, -2] },
    { id: 'ws2', type: 'workstation', status: 'clean', position: [0, -2, -2] },
    { id: 'ws3', type: 'workstation', status: 'clean', position: [5, -2, -2] },
  ];

  const edges: Edge[] = [
    { from: 'firewall', to: 'web1', active: false },
    { from: 'firewall', to: 'web2', active: false },
    { from: 'web1', to: 'db1', active: false },
    { from: 'web2', to: 'db2', active: false },
    { from: 'web1', to: 'ws1', active: false },
    { from: 'web2', to: 'ws2', active: false },
    { from: 'web2', to: 'ws3', active: false },
    { from: 'db1', to: 'db2', active: false },
  ];

  useEffect(() => {
    if (!containerRef.current) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a0a);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(
      75,
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      1000
    );
    camera.position.set(0, 5, 10);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const ambientLight = new THREE.AmbientLight(0x404040, 2);
    scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0x9b87f5, 1, 100);
    pointLight.position.set(0, 10, 0);
    scene.add(pointLight);

    const getNodeColor = (status: string) => {
      switch (status) {
        case 'compromised': return 0xf97316;
        case 'exfiltrated': return 0xef4444;
        default: return 0x0EA5E9;
      }
    };

    nodes.forEach(node => {
      const geometry = new THREE.SphereGeometry(0.5, 32, 32);
      const material = new THREE.MeshPhongMaterial({
        color: getNodeColor(node.status),
        emissive: getNodeColor(node.status),
        emissiveIntensity: 0.3,
      });
      const sphere = new THREE.Mesh(geometry, material);
      sphere.position.set(...node.position);
      scene.add(sphere);
      nodesRef.current.set(node.id, sphere);
    });

    edges.forEach(edge => {
      const fromNode = nodes.find(n => n.id === edge.from);
      const toNode = nodes.find(n => n.id === edge.to);
      if (!fromNode || !toNode) return;

      const points = [
        new THREE.Vector3(...fromNode.position),
        new THREE.Vector3(...toNode.position),
      ];
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const material = new THREE.LineBasicMaterial({
        color: 0x666666,
        opacity: 0.3,
        transparent: true,
      });
      const line = new THREE.Line(geometry, material);
      scene.add(line);
    });

    let isDragging = false;
    let previousMousePosition = { x: 0, y: 0 };

    const onMouseDown = () => { isDragging = true; };
    const onMouseUp = () => { isDragging = false; };
    const onMouseMove = (e: MouseEvent) => {
      if (isDragging && cameraRef.current) {
        const deltaX = e.clientX - previousMousePosition.x;
        const deltaY = e.clientY - previousMousePosition.y;
        
        const rotationSpeed = 0.005;
        const currentPos = cameraRef.current.position.clone();
        const distance = currentPos.length();
        
        const theta = Math.atan2(currentPos.x, currentPos.z);
        const phi = Math.acos(currentPos.y / distance);
        
        const newTheta = theta - deltaX * rotationSpeed;
        const newPhi = Math.max(0.1, Math.min(Math.PI - 0.1, phi - deltaY * rotationSpeed));
        
        cameraRef.current.position.x = distance * Math.sin(newPhi) * Math.sin(newTheta);
        cameraRef.current.position.y = distance * Math.cos(newPhi);
        cameraRef.current.position.z = distance * Math.sin(newPhi) * Math.cos(newTheta);
        cameraRef.current.lookAt(0, 0, 0);
      }
      previousMousePosition = { x: e.clientX, y: e.clientY };
    };

    renderer.domElement.addEventListener('mousedown', onMouseDown);
    renderer.domElement.addEventListener('mouseup', onMouseUp);
    renderer.domElement.addEventListener('mousemove', onMouseMove);

    const animate = () => {
      requestAnimationFrame(animate);
      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    };
    animate();

    const handleResize = () => {
      if (containerRef.current && cameraRef.current && rendererRef.current) {
        const width = containerRef.current.clientWidth;
        const height = containerRef.current.clientHeight;
        cameraRef.current.aspect = width / height;
        cameraRef.current.updateProjectionMatrix();
        rendererRef.current.setSize(width, height);
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      renderer.domElement.removeEventListener('mousedown', onMouseDown);
      renderer.domElement.removeEventListener('mouseup', onMouseUp);
      renderer.domElement.removeEventListener('mousemove', onMouseMove);
      if (containerRef.current && rendererRef.current) {
        containerRef.current.removeChild(rendererRef.current.domElement);
      }
      rendererRef.current?.dispose();
    };
  }, []);

  useEffect(() => {
    const phaseCompromise = [
      [],
      ['web1'],
      ['web1', 'db1', 'ws1'],
      ['web1', 'db1', 'ws1', 'web2'],
      ['web1', 'db1', 'ws1', 'web2', 'db2', 'ws2'],
      ['web1', 'db1', 'ws1', 'web2', 'db2', 'ws2', 'ws3'],
    ];

    const compromisedNodes = phaseCompromise[Math.min(phase, phaseCompromise.length - 1)] || [];
    
    nodesRef.current.forEach((mesh, nodeId) => {
      const material = mesh.material as THREE.MeshPhongMaterial;
      if (compromisedNodes.includes(nodeId)) {
        material.color.setHex(0xef4444);
        material.emissive.setHex(0xef4444);
        material.emissiveIntensity = 0.5;
      } else {
        material.color.setHex(0x0EA5E9);
        material.emissive.setHex(0x0EA5E9);
        material.emissiveIntensity = 0.3;
      }
    });
  }, [phase]);

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">3D Network Topology</h3>
      <div ref={containerRef} className="w-full h-[500px] rounded-lg overflow-hidden" />
      <p className="text-sm text-muted-foreground mt-4">
        Drag to rotate • Blue: Clean • Red: Compromised
      </p>
    </Card>
  );
};

export default NetworkTopology3D;
