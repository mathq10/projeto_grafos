import React, { useState, useEffect, useRef } from "react";
import cytoscape from "cytoscape";

// Componentes de estilo
const Button = ({ children, ...props }) => (
  <button
    className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-all"
    {...props}
  >
    {children}
  </button>
);

const Card = ({ children }) => <div className="card">{children}</div>;

const CardContent = ({ children }) => <div>{children}</div>;

export default function GraphApp() {
  const cyRef = useRef(null);
  const containerRef = useRef(null);
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [adjMatrix, setAdjMatrix] = useState([]);
  const [matrixInput, setMatrixInput] = useState("");
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [routesOutput, setRoutesOutput] = useState("");
  const [selectedNode, setSelectedNode] = useState(null);

  useEffect(() => {
    cyRef.current = cytoscape({
      container: containerRef.current,
      elements: [],
      style: [
        {
          selector: "node",
          style: {
            content: "data(label)",
            "text-valign": "center",
            "background-color": "#007bff",
            color: "#fff",
            width: 40,
            height: 40,
          },
        },
        {
          selector: "edge",
          style: {
            label: "data(weight)",
            "curve-style": "bezier",
            "target-arrow-shape": "triangle",
            "line-color": "#aaa",
          },
        },
      ],
      layout: { name: "grid" },
    });

    cyRef.current.on("tap", (event) => {
      if (event.target === cyRef.current) {
        const id = `n${nodes.length}`;
        const newNode = { data: { id, label: id }, position: event.position };
        setNodes((prev) => [...prev, newNode]);
        cyRef.current.add(newNode);
      }
    });

    cyRef.current.on("tap", "node", (event) => {
      const selected = event.target.id();
      if (selectedNode && selectedNode !== selected) {
        const source = selectedNode;
        const target = selected;
        const weight = prompt("Peso da aresta:", "1");
        const edgeId = `${source}-${target}`;
        const newEdge = { data: { id: edgeId, source, target, weight } };
        setEdges((prev) => [...prev, newEdge]);
        cyRef.current.add(newEdge);
        setSelectedNode(null);
      } else {
        setSelectedNode(selected);
      }
    });
  }, [nodes, selectedNode]);

  // Funções de geração e manipulação de matriz de adjacência
  const generateAdjMatrix = () => {
    const matrix = nodes.map((_, i) => nodes.map((_, j) => 0));
    edges.forEach(({ data: { source, target, weight } }) => {
      const i = nodes.findIndex((n) => n.data.id === source);
      const j = nodes.findIndex((n) => n.data.id === target);
      matrix[i][j] = parseInt(weight);
    });
    setAdjMatrix(matrix);
  };

  const drawFromMatrix = () => {
    const lines = matrixInput.trim().split("\n");
    const matrix = lines.map((line) => line.trim().split(/\s+/).map(Number));
    setAdjMatrix(matrix);
    cyRef.current.elements().remove();
    const newNodes = matrix.map((_, i) => ({
      data: { id: `n${i}`, label: `n${i}` },
    }));
    const newEdges = [];

    for (let i = 0; i < matrix.length; i++) {
      for (let j = 0; j < matrix[i].length; j++) {
        if (matrix[i][j] > 0) {
          newEdges.push({
            data: {
              id: `n${i}-n${j}`,
              source: `n${i}`,
              target: `n${j}`,
              weight: matrix[i][j],
            },
          });
        }
      }
    }

    setNodes(newNodes);
    setEdges(newEdges);
    cyRef.current.add([...newNodes, ...newEdges]);
    cyRef.current.layout({ name: "grid" }).run();
  };

  const findAllPaths = (
    start,
    end,
    visited = new Set(),
    path = [],
    allPaths = []
  ) => {
    visited.add(start);
    path.push(start);

    if (start === end) {
      allPaths.push([...path]);
    } else {
      const neighbors = adjMatrix[start]
        .map((weight, index) => (weight > 0 ? index : -1))
        .filter((i) => i !== -1 && !visited.has(i));
      for (const neighbor of neighbors) {
        findAllPaths(neighbor, end, new Set(visited), [...path], allPaths);
      }
    }
    return allPaths;
  };

  const calculateRoutes = () => {
    const startIdx = parseInt(origin.replace("n", ""));
    const endIdx = parseInt(destination.replace("n", ""));
    const paths = findAllPaths(startIdx, endIdx);
    if (paths.length === 0) {
      setRoutesOutput("Nenhuma rota encontrada.");
      return;
    }
    const routeWithCost = paths.map((path) => {
      let cost = 0;
      for (let i = 0; i < path.length - 1; i++) {
        cost += adjMatrix[path[i]][path[i + 1]];
      }
      return { path: path.map((i) => `n${i}`), cost };
    });
    routeWithCost.sort((a, b) => a.cost - b.cost);
    const output = [
      "Todas as rotas:",
      ...routeWithCost.map((r) => `${r.path.join(" -> ")} (Custo: ${r.cost})`),
      `\nRota mais curta: ${routeWithCost[0].path.join(" -> ")} (Custo: ${
        routeWithCost[0].cost
      })`,
      `Rota mais longa: ${routeWithCost[routeWithCost.length - 1].path.join(
        " -> "
      )} (Custo: ${routeWithCost[routeWithCost.length - 1].cost})`,
    ].join("\n");
    setRoutesOutput(output);
  };

  return (
    <div className="App grid-container">
      <Card>
        <CardContent>
          <div className="h-[500px] border rounded-lg" ref={containerRef}></div>
          <Button className="mt-4" onClick={generateAdjMatrix}>
            Gerar Matriz de Adjacência
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <h2 className="card-header">Matriz de Adjacência</h2>
          <pre className="text-sm overflow-x-auto mb-2">
            {adjMatrix.map((row) => row.join(" ")).join("\n")}
          </pre>
          <textarea
            className="w-full h-32 p-2 border rounded mb-2 text-sm"
            placeholder="Insira a matriz manualmente\nEx: 0 1 0\n1 0 1\n0 1 0"
            value={matrixInput}
            onChange={(e) => setMatrixInput(e.target.value)}
          />
          <Button onClick={drawFromMatrix}>Desenhar Grafo da Matriz</Button>

          <div className="mt-2">
            <input
              type="text"
              placeholder="Origem (ex: n0)"
              value={origin}
              onChange={(e) => setOrigin(e.target.value)}
              className="border rounded p-1 mr-2 text-sm"
            />
            <input
              type="text"
              placeholder="Destino (ex: n2)"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              className="border rounded p-1 text-sm"
            />
            <Button onClick={calculateRoutes}>Calcular Rotas</Button>
          </div>

          <pre className="text-sm whitespace-pre-wrap mt-2">{routesOutput}</pre>
        </CardContent>
      </Card>
    </div>
  );
}
