import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { productApi } from "../api/catalog";
import "../styles/details.css";

export default function DrinkDetails() {
    const { id } = useParams();
    const [drink, setDrink] = useState(null);

    useEffect(() => {
        productApi.drink(id).then(setDrink);
    }, [id]);

    if (!drink) return <p>Loading...</p>;

    return (
        <div className="details-container">
            <img src={drink.imageUrl} alt={drink.name} className="details-image" />
            <div className="details-content">
                <h1>{drink.name}</h1>
                <p>{drink.description}</p>
                <p className="price">Price: {drink.price.toFixed(2)} BGN</p>

                <button className="btn" disabled={!drink.isAvailable}>
                    Add to cart
                </button>
                <div>
                    <Link to="/menu">← Back to menu</Link>
                </div>
            </div>
        </div>
    );
}
