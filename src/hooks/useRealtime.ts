import { BaseModel, onDocChange } from "pocketto";
import { ModelStatic } from "pocketto/dist/src/definitions/Model";
import { useEffect, useState } from "react";

export function useRealtime<T extends BaseModel>(type: ModelStatic<T>, id?: string) {
    const [data, setDefaultData] = useState<T>(new type());
    const setData = (value: T) => {
        const json = value.toJson();
        const klass = value.getClass();
        const newData = new klass();
        newData.fill(json);
        newData._meta._rev = value._meta._rev;
        setDefaultData(newData as T);
    };

    const [changedDoc, setChangedDoc] = useState<T>();
    useEffect(() => {
        const docChange = async (newId: string) => {
            const modelName = new type().getClass().collectionName as string + '.';
            newId = newId.replace(modelName, '');
            if (newId !== data.id) return;
            const doc = await data.getClass().query().find(newId) as T;
            setChangedDoc(doc);
        }
        const event = onDocChange(docChange);
        return () => {
            event.off('docChange', docChange);
        }
    }, [data]);

    useEffect(() => {
        if (id) {
            new type().getClass().find(id).then((doc) => {
                setData(doc as T);
            });
        } else {
            setData(new type());
        }
    }, [id]);

    useEffect(() => {
        if (changedDoc) {
            setData(changedDoc);
        }
    }, [changedDoc]);

    return [data, setData] as [T, (value: T) => void];
}
