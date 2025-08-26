import { generateClient } from "aws-amplify/data";
import type { Schema } from "../../../../amplify/data/resource";
import type {
  AnnotationType,
  AnnotationCreateType,
  AnnotationUpdateType,
} from "../types/annotation";

const client = generateClient<Schema>();

class AnnotationService {
  async createAnnotation(data: AnnotationCreateType): Promise<AnnotationType> {
    try {
      console.log("Creating annotation with data:", data);

      const result = await client.models.Annotation.create({
        documentId: data.documentId,
        pageNumber: data.pageNumber,
        content: data.content,
        x: data.x,
        y: data.y,
        leaderX: data.leaderX,
        leaderY: data.leaderY,
        width: data.width,
        height: data.height,
      });

      console.log("Annotation creation result:", result);

      if (!result.data) {
        console.error(
          "Annotation creation failed - no data in result:",
          result
        );
        throw new Error(
          `Failed to create annotation: ${JSON.stringify(result.errors || "Unknown error")}`
        );
      }

      return this.convertToAnnotation(result.data);
    } catch (error) {
      console.error("Error in createAnnotation:", error);
      throw error;
    }
  }

  async getAnnotationsByDocument(
    documentId: string,
    pageNumber?: number
  ): Promise<AnnotationType[]> {
    try {
      console.log(
        "Loading annotations for document:",
        documentId,
        "page:",
        pageNumber
      );

      const filter: any = { documentId: { eq: documentId } };
      if (pageNumber !== undefined) {
        filter.pageNumber = { eq: pageNumber };
      }

      const result = await client.models.Annotation.list({ filter });

      console.log("Loaded annotations result:", result);

      return (result.data || []).map(this.convertToAnnotation);
    } catch (error) {
      console.error("Error in getAnnotationsByDocument:", error);
      throw error;
    }
  }

  async updateAnnotation(data: AnnotationUpdateType): Promise<AnnotationType> {
    try {
      console.log("Updating annotation:", data.id, "with data:", data);

      const existing = await client.models.Annotation.get({ id: data.id });
      if (!existing.data) {
        throw new Error("Annotation not found");
      }

      const result = await client.models.Annotation.update({
        id: data.id,
        content: data.content ?? existing.data.content,
        x: data.x ?? existing.data.x,
        y: data.y ?? existing.data.y,
        leaderX: data.leaderX ?? existing.data.leaderX,
        leaderY: data.leaderY ?? existing.data.leaderY,
        width: data.width ?? existing.data.width,
        height: data.height ?? existing.data.height,
      });

      if (!result.data) {
        throw new Error("Failed to update annotation");
      }

      return this.convertToAnnotation(result.data);
    } catch (error) {
      console.error("Error in updateAnnotation:", error);
      throw error;
    }
  }

  async deleteAnnotation(id: string): Promise<void> {
    try {
      console.log("Deleting annotation:", id);

      const result = await client.models.Annotation.delete({ id });

      if (!result.data) {
        throw new Error("Failed to delete annotation");
      }
    } catch (error) {
      console.error("Error in deleteAnnotation:", error);
      throw error;
    }
  }

  private convertToAnnotation(data: any): AnnotationType {
    return {
      id: data.id,
      documentId: data.documentId,
      pageNumber: data.pageNumber,
      content: data.content,
      x: data.x,
      y: data.y,
      leaderX: data.leaderX,
      leaderY: data.leaderY,
      width: data.width,
      height: data.height,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    };
  }
}

export const annotationService = new AnnotationService();
