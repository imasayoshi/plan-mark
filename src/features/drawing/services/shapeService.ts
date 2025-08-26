import { generateClient } from "aws-amplify/data";
import type { Schema } from "../../../../amplify/data/resource";
import type { Shape, ShapeCreateType, ShapeUpdateType } from "../types/shape";

const client = generateClient<Schema>();

class ShapeService {
  async getShapes(documentId: string, pageNumber: number): Promise<Shape[]> {
    try {
      console.log(
        "Loading shapes for document:",
        documentId,
        "page:",
        pageNumber
      );

      const result = await client.models.Shape.list({
        filter: {
          documentId: { eq: documentId },
          pageNumber: { eq: pageNumber },
        },
      });

      console.log("Loaded shapes result:", result);

      return (result.data || []).map(this.convertToShape);
    } catch (error) {
      console.error("Error in getShapes:", error);
      throw error;
    }
  }

  async createShape(shapeData: ShapeCreateType): Promise<Shape> {
    try {
      const properties = this.buildShapeProperties(shapeData);

      console.log("Creating shape with data:", {
        documentId: shapeData.documentId,
        pageNumber: shapeData.pageNumber,
        type: shapeData.type,
        x: shapeData.x,
        y: shapeData.y,
        color: shapeData.color || "#3b82f6",
        strokeWidth: shapeData.strokeWidth || 2,
        properties: properties,
      });

      const result = await client.models.Shape.create({
        documentId: shapeData.documentId,
        pageNumber: shapeData.pageNumber,
        type: shapeData.type,
        x: shapeData.x,
        y: shapeData.y,
        color: shapeData.color || "#3b82f6",
        strokeWidth: shapeData.strokeWidth || 2,
        properties: JSON.stringify(properties),
      });

      console.log("Shape creation result:", result);

      if (!result.data) {
        console.error("Shape creation failed - no data in result:", result);
        throw new Error(
          `Failed to create shape: ${JSON.stringify(result.errors || "Unknown error")}`
        );
      }

      return this.convertToShape(result.data);
    } catch (error) {
      console.error("Error in createShape:", error);
      throw error;
    }
  }

  async updateShape(updateData: ShapeUpdateType): Promise<Shape | null> {
    try {
      const existing = await client.models.Shape.get({ id: updateData.id });
      if (!existing.data) return null;

      const currentShape = this.convertToShape(existing.data);
      const updatedProperties = this.buildUpdateProperties(
        currentShape,
        updateData
      );

      console.log(
        "Updating shape:",
        updateData.id,
        "with properties:",
        updatedProperties
      );

      const result = await client.models.Shape.update({
        id: updateData.id,
        x: updateData.x ?? existing.data.x,
        y: updateData.y ?? existing.data.y,
        color: updateData.color ?? existing.data.color,
        strokeWidth: updateData.strokeWidth ?? existing.data.strokeWidth,
        properties: JSON.stringify(updatedProperties),
      });

      if (!result.data) return null;
      return this.convertToShape(result.data);
    } catch (error) {
      console.error("Error in updateShape:", error);
      throw error;
    }
  }

  async deleteShape(id: string): Promise<boolean> {
    const result = await client.models.Shape.delete({ id });
    return !!result.data;
  }

  private buildShapeProperties(
    shapeData: ShapeCreateType
  ): Record<string, any> {
    switch (shapeData.type) {
      case "rectangle":
        return {
          width: shapeData.width || 100,
          height: shapeData.height || 50,
        };
      case "circle":
        return {
          radius: shapeData.radius || 50,
        };
      case "arrow":
        return {
          endX: shapeData.endX || shapeData.x + 100,
          endY: shapeData.endY || shapeData.y,
        };
      case "polygon":
        return {
          points: shapeData.points || [
            { x: 0, y: -40 },
            { x: 30, y: 20 },
            { x: -30, y: 20 },
          ],
        };
      default:
        return {};
    }
  }

  private buildUpdateProperties(
    currentShape: Shape,
    updateData: ShapeUpdateType
  ): Record<string, any> {
    switch (currentShape.type) {
      case "rectangle":
        return {
          width: updateData.width ?? currentShape.width,
          height: updateData.height ?? currentShape.height,
        };
      case "circle":
        return {
          radius: updateData.radius ?? currentShape.radius,
        };
      case "arrow":
        return {
          endX: updateData.endX ?? currentShape.endX,
          endY: updateData.endY ?? currentShape.endY,
        };
      case "polygon":
        return {
          points: updateData.points ?? currentShape.points,
        };
      default:
        return {};
    }
  }

  private convertToShape(data: any): Shape {
    const properties =
      typeof data.properties === "string"
        ? JSON.parse(data.properties)
        : data.properties || {};

    switch (data.type) {
      case "rectangle":
        return {
          id: data.id,
          documentId: data.documentId,
          pageNumber: data.pageNumber,
          type: "rectangle",
          x: data.x,
          y: data.y,
          width: properties.width || 100,
          height: properties.height || 50,
          color: data.color,
          strokeWidth: data.strokeWidth,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
        };
      case "circle":
        return {
          id: data.id,
          documentId: data.documentId,
          pageNumber: data.pageNumber,
          type: "circle",
          x: data.x,
          y: data.y,
          radius: properties.radius || 50,
          color: data.color,
          strokeWidth: data.strokeWidth,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
        };
      case "arrow":
        return {
          id: data.id,
          documentId: data.documentId,
          pageNumber: data.pageNumber,
          type: "arrow",
          x: data.x,
          y: data.y,
          endX: properties.endX || data.x + 100,
          endY: properties.endY || data.y,
          color: data.color,
          strokeWidth: data.strokeWidth,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
        };
      case "polygon":
        return {
          id: data.id,
          documentId: data.documentId,
          pageNumber: data.pageNumber,
          type: "polygon",
          x: data.x,
          y: data.y,
          points: properties.points || [
            { x: 0, y: -40 },
            { x: 30, y: 20 },
            { x: -30, y: 20 },
          ],
          color: data.color,
          strokeWidth: data.strokeWidth,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
        };
      default:
        throw new Error(`Unsupported shape type: ${data.type}`);
    }
  }
}

export const shapeService = new ShapeService();
